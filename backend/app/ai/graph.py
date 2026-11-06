"""LangGraph workflow for the AI-assisted RCA.

            START ──(task?)──► extract ───────────────► END
                      │
                      └──────► investigate ──► capa ──► END

* task == "extract"     : read the incident text and populate the RCA form.
* task == "investigate" : run 5-Whys + Fishbone, propose root causes, list missing
                          evidence, then recommend CAPA.
All LLM calls go to Groq through langchain-groq and return validated Pydantic objects.
"""
import json
from typing import List, Literal, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from ..config import settings
from ..schemas import Analysis, CapaList, RCAForm

GMP_RULES = """You support a QA professional at an API (Active Pharmaceutical Ingredient) manufacturer
working under ICH Q7 / ICH Q10 / 21 CFR 211 principles.
Rules:
- Use ONLY facts present in the provided material. Never invent batch numbers, dates, names or measurements.
- If something is not stated, leave it empty (or say it is missing). Do not guess.
- Root causes you give are SUGGESTIONS. Mark supported_by_evidence=true only when the document itself
  contains evidence for that cause. Otherwise supported_by_evidence=false and confidence Low or Medium.
- Be concise, technical and specific to API manufacturing (reactors, crystallisation, drying, filtration, HPLC, etc.)."""


class RCAState(TypedDict, total=False):
    task: Literal["extract", "investigate"]
    text: str
    form: dict
    analysis: dict
    capas: List[dict]


def _llm():
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set. Add it to backend/.env (get one at https://console.groq.com/keys).")
    return ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0.1, max_retries=2)


def _structured(schema, system: str, user: str):
    llm = _llm().with_structured_output(schema)
    return llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])


def route(state: RCAState) -> str:
    return "extract" if state.get("task") == "extract" else "investigate"


def extract_node(state: RCAState) -> RCAState:
    system = GMP_RULES + "\nTask: extract the fields of a deviation / RCA form from the incident document."
    form: RCAForm = _structured(RCAForm, system, f"INCIDENT DOCUMENT:\n\"\"\"\n{state['text'][:24000]}\n\"\"\"")
    return {"form": form.model_dump()}


def investigate_node(state: RCAState) -> RCAState:
    system = GMP_RULES + """
Task: perform a root cause investigation.
1. why_analysis: a 5-Whys chain (up to 5 levels). Each step: question, answer, and the supporting evidence
   (short quote/reference from the material, or empty if none).
2. fishbone: for each of Man, Machine, Method, Material, Measurement, Environment list plausible causes
   (empty list if nothing relevant).
3. root_causes: 1-3 probable root causes with category, evidence_support, supported_by_evidence, confidence.
4. contributing_factors: secondary factors.
5. missing_evidence: records, data or interviews still needed (e.g. equipment logbook, batch record page,
   calibration status, operator training record, raw material CoA, trend data) and why each matters."""
    user = (
        f"RCA FORM:\n{json.dumps(state['form'], indent=2)}\n\n"
        f"ORIGINAL INCIDENT TEXT (may be empty):\n\"\"\"\n{state.get('text', '')[:24000]}\n\"\"\""
    )
    analysis: Analysis = _structured(Analysis, system, user)
    for rc in analysis.root_causes:
        rc.confirmed = False
        rc.status = "AI Suggestion"
    return {"analysis": analysis.model_dump()}


def capa_node(state: RCAState) -> RCAState:
    system = GMP_RULES + """
Task: recommend CAPA for the root causes below. For each root cause give at least one Corrective action
(fix the issue / contain) and where applicable one Preventive action (stop recurrence). Include a short
explanation of why the action addresses the cause, a suggested owner ROLE (not a person) and a realistic
due_in_days. Set linked_root_cause to the matching root cause text."""
    user = (
        f"DEVIATION: {json.dumps(state['form'], indent=2)}\n\n"
        f"ROOT CAUSES AND CONTRIBUTING FACTORS:\n{json.dumps(state['analysis'], indent=2)}"
    )
    result: CapaList = _structured(CapaList, system, user)
    return {"capas": [c.model_dump() for c in result.capas]}


def build_graph():
    g = StateGraph(RCAState)
    g.add_node("extract", extract_node)
    g.add_node("investigate", investigate_node)
    g.add_node("capa", capa_node)
    g.add_conditional_edges(START, route, {"extract": "extract", "investigate": "investigate"})
    g.add_edge("extract", END)
    g.add_edge("investigate", "capa")
    g.add_edge("capa", END)
    return g.compile()


rca_graph = build_graph()
