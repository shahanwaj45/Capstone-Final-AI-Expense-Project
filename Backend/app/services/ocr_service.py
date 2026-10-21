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

# Ordered model candidates with independent quota buckets
FALLBACK_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
]

PROMPT_TEXT = """Look at this receipt/invoice document and extract the financial information.
You must respond ONLY with a strict JSON object with this exact contract (no markdown, no code block backticks):
{
  "merchant": "Merchant or store name",
  "amount": 250.00,
  "date": "YYYY-MM-DD",
  "category": "Food"
}

Canonical categories allowed: Food, Travel, Education, Entertainment, Bills, Health, Shopping, Subscription, Other.
Date format MUST be YYYY-MM-DD. Amount must be a clean numeric float in Indian Rupee value. If a field cannot be determined, set it to null."""

def scan_receipt(file_path):
    """
    Extract expense data from a receipt image or PDF document using Gemini Flash Vision.
    Inspects bytes in memory using Pillow (PIL) and guarantees clean payloads.
    
    Returns: (dict | None, error_message | None)
    Contract: { "merchant": str, "amount": float, "date": "YYYY-MM-DD", "category": str }
    """
    gemini_key = os.environ.get('GEMINI_API_KEY', '').strip()
    
    if not gemini_key:
        logger.warning("No Gemini API key configured for receipt OCR")
        return None, "Gemini API key is not configured. Please add GEMINI_API_KEY to your Backend/.env file."
    
    images = []
    try:
        images = _load_file_pages(file_path)
    except Exception as e:
        logger.error(f"Failed to load receipt file {file_path}: {e}")
        return None, f"Could not read the uploaded document or image ({type(e).__name__}). Please check the file format."

    if not images:
        return None, "No readable pages or images found in the uploaded file."

    try:
        return _scan_with_gemini_multimodal(images, gemini_key)
    finally:
        # Ensure memory release of PIL images
        for img in images:
            try:
                img.close()
            except Exception:
                pass

def _load_file_pages(file_path):
    """
    Convert receipt image (PNG, JPG, WEBP) or PDF into memory-managed PIL Images.
    Ensures zero disk temp artifacts remain.
    """
    ext = os.path.splitext(file_path)[1].lower()
    pages = []
    
    if ext == '.pdf':
        try:
            import pymupdf
            doc = pymupdf.open(file_path)
            try:
                max_pages = min(len(doc), 2)
                for page_idx in range(max_pages):
                    page = doc[page_idx]
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    with Image.open(io.BytesIO(img_bytes)) as pil_img:
                        pages.append(pil_img.convert("RGB").copy())
            finally:
                doc.close()
        except Exception as e:
            logger.warning(f"PyMuPDF failed to render PDF: {e}. Trying fallback pdf readers...")
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(file_path)
                try:
                    for page_idx in range(min(len(pdf), 2)):
                        page = pdf[page_idx]
                        bitmap = page.render(scale=2)
                        pil_img = bitmap.to_pil().convert("RGB")
                        pages.append(pil_img.copy())
                finally:
                    pdf.close()
            except Exception as e2:
                logger.error(f"All PDF renderers failed: {e2}")
                raise e
    else:
        # Load image via Pillow in memory
        with Image.open(file_path) as raw_img:
            pages.append(raw_img.convert("RGB").copy())
            
    return pages

def _get_candidate_models():
    """Build candidate model list starting with user's configured model, followed by all fallbacks."""
    configured = os.environ.get('AI_MODEL', '').strip()
    candidates = []
    if configured:
        candidates.append(configured)
    for fm in FALLBACK_MODELS:
        if fm not in candidates:
            candidates.append(fm)
    return candidates

def _extract_json_from_text(raw_text):
    """Robustly extract and parse strict contract JSON from model output."""
    text = raw_text.strip()
    if '```' in text:
        code_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
        if code_match:
            text = code_match.group(1).strip()
    
    json_match = re.search(r'(\{[\s\S]*\})', text)
    if json_match:
        text = json_match.group(1).strip()
        
    data = json.loads(text)
    
    # Enforce strict float amount
    raw_amount = data.get('amount')
    cleaned_amount = 0.0
    if raw_amount is not None:
        if isinstance(raw_amount, (int, float)):
            cleaned_amount = round(float(raw_amount), 2)
        else:
            amt_str = re.sub(r'[^\d.]', '', str(raw_amount).replace(',', ''))
            try:
                cleaned_amount = round(float(amt_str), 2)
            except ValueError:
                cleaned_amount = 0.0
    data['amount'] = cleaned_amount

    # Enforce canonical category
    category = data.get('category')
    if category and isinstance(category, str):
        cat_title = category.strip().capitalize()
        matched = next((c for c in VALID_CATEGORIES if c.lower() == cat_title.lower()), None)
        data['category'] = matched if matched else 'Other'
    else:
        data['category'] = 'Other'

    # Enforce merchant string
    merchant = str(data.get('merchant') or '').strip()
    data['merchant'] = merchant if merchant and merchant.lower() != 'null' else "Scanned Merchant"

    # Enforce YYYY-MM-DD date
    raw_date = str(data.get('date') or '').strip()
    if raw_date and len(raw_date) >= 10:
        match_dt = re.search(r'\d{4}-\d{2}-\d{2}', raw_date)
        data['date'] = match_dt.group(0) if match_dt else None
    else:
        data['date'] = None

    return data

def _scan_with_gemini_multimodal(images, api_key):
    """
    Cycles through candidate models.
    If a model hits 429 quota exhaustion or 404, it seamlessly cascades to the next candidate model.
    """
    candidate_models = _get_candidate_models()
    last_error = None
    all_quota_exhausted = True
    
    # Strategy 1: Modern google.genai
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
                logger.warning(f"google.genai model {model_name} failed: {err_msg}")
                # If 429 quota error, do NOT fail immediately! Try the next candidate model!
                if '429' in err_msg or 'quota' in err_msg.lower() or 'resourceexhausted' in err_msg.lower():
                    logger.info(f"Model {model_name} quota exceeded. Cascading to next candidate...")
                    continue
                else:
                    all_quota_exhausted = False
                    
                if any(k in err_msg.lower() for k in ['404', 'not found', 'deprecated']):
                    continue
                if any(k in err_msg.lower() for k in ['unauthenticated', 'invalid api key', '401', '403']):
                    return None, "Gemini API key is invalid or unauthorized. Please verify GEMINI_API_KEY in Backend/.env"
                continue
    except ImportError:
        logger.info("google.genai package not available, falling back to google.generativeai")

    # Strategy 2: Legacy google.generativeai fallback
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
                logger.warning(f"google.generativeai model {model_name} failed: {err_msg}")
                if '429' in err_msg or 'quota' in err_msg.lower() or 'resourceexhausted' in err_msg.lower():
                    logger.info(f"Model {model_name} quota exceeded. Cascading to next candidate...")
                    continue
                if any(k in err_msg.lower() for k in ['404', 'not found', 'deprecated']):
                    continue
                if any(k in err_msg.lower() for k in ['unauthenticated', 'invalid api key', '401', '403']):
                    return None, "Gemini API key is invalid or unauthorized."
                continue
    except Exception as e:
        last_error = str(e)

    if last_error and ('429' in last_error or 'quota' in last_error.lower() or 'resourceexhausted' in last_error.lower()):
        return None, "Gemini API free-tier quota exceeded on all models. Please enter details manually or update your Google AI Studio plan."

    clean_err = last_error or "Unknown error"
    if len(clean_err) > 160:
        clean_err = clean_err[:160] + "..."
    return None, f"OCR scanning failed: {clean_err}. Please enter the expense details manually."
