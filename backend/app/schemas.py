from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RCAForm(BaseModel):
    deviation_id: str = ""
    title: str = ""
    product_name: str = ""
    batch_number: str = ""
    process_step: str = Field("", description="Manufacturing step / unit operation / equipment involved")
    date_detected: str = ""
    reported_by: str = ""
    severity: str = Field("", description="Minor, Major or Critical, only if stated or clearly implied")
    description: str = Field("", description="Factual description of what happened")
    immediate_action: str = Field("", description="Containment / immediate actions already taken")
    impact_assessment: str = Field("", description="Product, patient, batch or compliance impact")
    evidence_available: List[str] = Field(default_factory=list, description="Evidence mentioned in the document")


class WhyStep(BaseModel):
    level: int
    question: str
    answer: str
    evidence: str = Field("", description="Quote or reference from the source that supports this answer; empty if none")


class FishboneCategory(BaseModel):
    category: Literal["Man", "Machine", "Method", "Material", "Measurement", "Environment"]
    causes: List[str] = Field(default_factory=list)


class RootCause(BaseModel):
    cause: str
    category: str = ""
    evidence_support: str = Field("", description="Evidence from the document supporting this cause")
    supported_by_evidence: bool = False
    confidence: Literal["High", "Medium", "Low"] = "Low"
    confirmed: bool = False  # only a qualified person may set this
    status: str = "AI Suggestion"


class MissingEvidence(BaseModel):
    item: str
    reason: str = ""


class Analysis(BaseModel):
    why_analysis: List[WhyStep] = Field(default_factory=list)
    fishbone: List[FishboneCategory] = Field(default_factory=list)
    root_causes: List[RootCause] = Field(default_factory=list)
    contributing_factors: List[str] = Field(default_factory=list)
    missing_evidence: List[MissingEvidence] = Field(default_factory=list)


class Capa(BaseModel):
    type: Literal["Corrective", "Preventive"]
    action: str
    explanation: str = ""
    linked_root_cause: str = ""
    owner_role: str = ""
    due_in_days: Optional[int] = None


class CapaList(BaseModel):
    capas: List[Capa] = Field(default_factory=list)


class ExtractRequest(BaseModel):
    text: str


class InvestigateRequest(BaseModel):
    text: str = ""
    form: RCAForm


class InvestigationIn(BaseModel):
    id: Optional[int] = None
    status: str = "Draft"
    confirmed_by: str = ""
    source_text: str = ""
    form: RCAForm
    analysis: Analysis = Analysis()
    capas: List[Capa] = []


class InvestigationOut(InvestigationIn):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class InvestigationSummary(BaseModel):
    id: int
    deviation_id: str
    title: str
    product_name: str
    batch_number: str
    severity: str
    status: str
    updated_at: datetime
    model_config = {"from_attributes": True}
