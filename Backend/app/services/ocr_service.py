import os
import io
import re
import json
import logging
from PIL import Image

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {
    'Food', 'Travel', 'Education', 'Entertainment', 'Bills', 
    'Health', 'Shopping', 'Subscription', 'Other'
}

FALLBACK_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
]

def scan_receipt(file_path):
    """
    Extract expense data from a receipt image or PDF document using Gemini Vision.
    
    Returns: (dict | None, error_message | None)
    dict shape: { merchant, amount, date, category }
    """
    gemini_key = os.environ.get('GEMINI_API_KEY', '').strip()
    
    if not gemini_key:
        logger.warning("No Gemini API key configured for receipt OCR")
        return None, "Gemini API key is not configured. Please add GEMINI_API_KEY to your Backend/.env file."
    
    # 1. Load image or PDF document
    try:
        images = _load_file_pages(file_path)
    except Exception as e:
        logger.error(f"Failed to load receipt file {file_path}: {e}")
        return None, f"Could not read the uploaded document or image ({type(e).__name__}). Please check the file format."

    if not images:
        return None, "No readable pages or images found in the uploaded file."

    # 2. Extract with Gemini (trying google.genai first, then google.generativeai)
    return _scan_with_gemini_multimodal(images, gemini_key)

def _load_file_pages(file_path):
    """
    Convert receipt image or PDF into a list of PIL Images.
    Ensures file handles are promptly closed for Windows file lock compatibility.
    """
    ext = os.path.splitext(file_path)[1].lower()
    pages = []
    
    if ext == '.pdf':
        try:
            import pymupdf
            doc = pymupdf.open(file_path)
            # Process up to first 2 pages for receipt
            max_pages = min(len(doc), 2)
            for page_idx in range(max_pages):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                pages.append(img)
            doc.close()
        except Exception as e:
            logger.warning(f"PyMuPDF failed to render PDF: {e}. Trying fallback pdf readers...")
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(file_path)
                for page_idx in range(min(len(pdf), 2)):
                    page = pdf[page_idx]
                    bitmap = page.render(scale=2)
                    pages.append(bitmap.to_pil().convert("RGB"))
                pdf.close()
            except Exception as e2:
                logger.error(f"All PDF renderers failed: {e2}")
                raise e
    else:
        with Image.open(file_path) as raw_img:
            # Copy into memory and convert to RGB
            pages.append(raw_img.convert("RGB").copy())
            
    return pages

def _get_candidate_models():
    """Build candidate model list starting with user's configured model."""
    configured = os.environ.get('AI_MODEL', '').strip()
    candidates = []
    if configured:
        candidates.append(configured)
    for fm in FALLBACK_MODELS:
        if fm not in candidates:
            candidates.append(fm)
    return candidates

def _extract_json_from_text(raw_text):
    """Robustly extract and parse JSON from model output."""
    text = raw_text.strip()
    # Strip markdown code blocks
    if '```' in text:
        # Match code block content
        code_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
        if code_match:
            text = code_match.group(1).strip()
    
    # Locate first { and last }
    json_match = re.search(r'(\{[\s\S]*\})', text)
    if json_match:
        text = json_match.group(1).strip()
        
    data = json.loads(text)
    
    # Normalize amount
    raw_amount = data.get('amount')
    cleaned_amount = None
    if raw_amount is not None:
        if isinstance(raw_amount, (int, float)):
            cleaned_amount = round(float(raw_amount), 2)
        else:
            amt_str = re.sub(r'[^\d.]', '', str(raw_amount).replace(',', ''))
            try:
                cleaned_amount = round(float(amt_str), 2)
            except ValueError:
                cleaned_amount = None
    data['amount'] = cleaned_amount

    # Normalize category
    category = data.get('category')
    if category and isinstance(category, str):
        cat_title = category.strip().capitalize()
        matched = next((c for c in VALID_CATEGORIES if c.lower() == cat_title.lower()), None)
        data['category'] = matched if matched else 'Other'
    else:
        data['category'] = 'Other'

    # Normalize merchant & date
    data['merchant'] = str(data.get('merchant') or '').strip() or None
    data['date'] = str(data.get('date') or '').strip() or None

    return data

PROMPT_TEXT = """Look at this receipt/invoice document and extract the following information.
Respond ONLY with valid JSON, no conversational markdown:
{
  "merchant": "store or vendor name, or null",
  "amount": 250.00,
  "date": "YYYY-MM-DD or null if not found",
  "category": "Food"
}

Valid categories: Food, Travel, Education, Entertainment, Bills, Health, Shopping, Subscription, Other.
Pick the most suitable category. If you cannot find a field, set it to null."""

def _scan_with_gemini_multimodal(images, api_key):
    """Try modern google.genai first, then google.generativeai, cycling through model candidates."""
    candidate_models = _get_candidate_models()
    last_error = None
    
    # Strategy 1: google.genai (modern official SDK)
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        
        for model_name in candidate_models:
            try:
                contents = [PROMPT_TEXT] + images
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents
                )
                if response and response.text:
                    parsed = _extract_json_from_text(response.text)
                    return parsed, None
            except Exception as e:
                err_msg = str(e)
                last_error = err_msg
                logger.warning(f"google.genai with model {model_name} failed: {err_msg}")
                # If error is 404 / model not found / deprecated, continue to next model candidate
                if any(k in err_msg.lower() for k in ['404', 'not found', 'no longer available', 'deprecated', 'invalid model']):
                    continue
                # If it's auth or quota, don't keep hammering
                if 'quota' in err_msg.lower() or '429' in err_msg or 'resourceexhausted' in err_msg.lower():
                    return None, "Gemini API quota exceeded. Please check your Google AI Studio plan or limits."
                if any(k in err_msg.lower() for k in ['unauthenticated', 'invalid api key', 'api_key_invalid', '401', '403']):
                    return None, "Gemini API key is invalid or unauthorized. Please verify GEMINI_API_KEY in Backend/.env"
                continue
    except ImportError:
        logger.info("google.genai package not available, falling back to google.generativeai")

    # Strategy 2: google.generativeai (legacy fallback)
    try:
        import google.generativeai as legacy_genai
        legacy_genai.configure(api_key=api_key)
        
        for model_name in candidate_models:
            try:
                model = legacy_genai.GenerativeModel(model_name)
                contents = [PROMPT_TEXT] + images
                response = model.generate_content(contents)
                if response and response.text:
                    parsed = _extract_json_from_text(response.text)
                    return parsed, None
            except Exception as e:
                err_msg = str(e)
                last_error = err_msg
                logger.warning(f"google.generativeai with model {model_name} failed: {err_msg}")
                if any(k in err_msg.lower() for k in ['404', 'not found', 'no longer available', 'deprecated']):
                    continue
                if 'quota' in err_msg.lower() or '429' in err_msg:
                    return None, "Gemini API quota exceeded. Please check your Google AI Studio plan or limits."
                if any(k in err_msg.lower() for k in ['unauthenticated', 'invalid api key', '401', '403']):
                    return None, "Gemini API key is invalid or unauthorized. Please verify GEMINI_API_KEY in Backend/.env"
                continue
    except Exception as e:
        last_error = str(e)

    clean_err = last_error or "Unknown error"
    if len(clean_err) > 160:
        clean_err = clean_err[:160] + "..."
    return None, f"OCR scanning failed: {clean_err}. Please enter the expense details manually."
