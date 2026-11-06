from fastapi import APIRouter, File, HTTPException, UploadFile

from ..ai.graph import rca_graph
from ..extraction import extract_text
from ..schemas import ExtractRequest, InvestigateRequest

router = APIRouter(prefix="/api", tags=["ai"])


@router.post("/documents/extract-text")
async def document_to_text(file: UploadFile = File(...)):
    """Step 0: PDF / TXT / EML  ->  plain text shown in the AI panel."""
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 15 MB)")
    try:
        return {"filename": file.filename, "text": extract_text(file.filename or "", data)}
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/ai/extract")
def ai_extract(req: ExtractRequest):
    """Step 1: LangGraph 'extract' branch -> populated RCA form."""
    if not req.text.strip():
        raise HTTPException(422, "Provide incident text, an email, or a document first.")
    try:
        out = rca_graph.invoke({"task": "extract", "text": req.text})
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except Exception as e:  # Groq / network errors
        raise HTTPException(502, f"AI service error: {e}")
    return {"form": out["form"]}


@router.post("/ai/investigate")
def ai_investigate(req: InvestigateRequest):
    """Step 2: LangGraph 'investigate -> capa' branch using the (user-edited) form."""
    try:
        out = rca_graph.invoke({"task": "investigate", "text": req.text, "form": req.form.model_dump()})
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(502, f"AI service error: {e}")
    return {"analysis": out["analysis"], "capas": out["capas"]}
