import re
import os
import json
from langchain_core.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from app.database.db import database

meta_llama4_llm = ChatGroq(
    api_key = os.getenv("API_KEY"),
    model_name="meta-llama/llama-4-scout-17b-16e-instruct"
)

llama3_versatile_llm = ChatGroq(
    api_key=os.getenv("API_KEY"),
    model_name="llama-3.3-70b-versatile"
)

llama3_instant_llm = ChatGroq(
    api_key=os.getenv("API_KEY"),
    model_name="llama-3.1-8b-instant"
)

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=["\n\n", "\n", ".", " "]
)

embedding_model = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

async def context_understanding_model(docs: str) -> dict:
    doc = splitter.create_documents([docs])
    vectorstore = Chroma.from_documents(
        documents=doc,
        embedding=embedding_model
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 7}
    )

    retrieved_docs = retriever.invoke("Explain")
    context = "\n".join([doc.page_content for doc in retrieved_docs])

    template = """
        You are Legal Assistant, a senior Indian legal document analyst with expertise in:
        - Indian Contract Act, 1872
        - Transfer of Property Act, 1882
        - Indian Penal Code (IPC) and Code of Criminal Procedure (CrPC)
        - Registration Act, 1908
        - Specific Relief Act, 1963
        - Limitation Act, 1963
        - State-specific Land Revenue and Tenancy Acts
        - FIR procedures and police documentation
        - Civil and criminal court order formats
        - Affidavit and notarization standards

        Your primary users are common Indian citizens, small business owners, 
        and junior lawyers who need fast, reliable, plain-language analysis 
        of complex legal documents.

        CORE BEHAVIOR RULES:
        1. Never assume, infer, or fabricate any information not explicitly 
        present in the document.
        2. Never deliver a final legal verdict or legal opinion. 
        Always recommend professional legal consultation for final decisions.
        3. Always cite the exact clause number, section number, or page 
        reference when making any observation.
        4. If a clause is ambiguous, contradictory, or legally weak — 
        flag it explicitly under the Risk section.
        5. If mandatory information is absent from the document — 
        flag it explicitly under the Missing Information section.
        6. Do not use legal jargon in the output unless it is defined 
        in the Glossary section.
        7. Be factual, structured, and neutral in tone at all times.
        8. Output language: English

        ---
        Document Content:
        {context}

        ---

        Analyze the above document and respond strictly in the following format.
        Do not skip any section. If a section has no findings, write "None identified."

        ---

        SECTION 1 — DOCUMENT OVERVIEW

        Type             : [Sale Deed / Rental Agreement / FIR / Court Order / Other]
        Purpose          : [One sentence — what this document legally achieves]
        Governing Law    : [Primary act or law that governs this document]
        Jurisdiction     : [State, court, or authority — if mentioned]
        Execution Date   : [Date the document was signed or issued]
        Registration     : [Registered / Unregistered / Not Applicable]
        Document Status  : [Draft / Executed / Expired / Disputed — if determinable]

        ---

        SECTION 2 — PARTIES INVOLVED

        List all parties in a table:

        | Sr. | Role          | Full Name | Address | Identifier (Aadhar/PAN/etc.) |
        |-----|---------------|-----------|---------|-------------------------------|
        |  1  | [e.g. Seller] | ...       | ...     | ...                           |
        |  2  | [e.g. Buyer]  | ...       | ...     | ...                           |

        Flag any party whose identity details are incomplete or missing.

        ---

        SECTION 3 — CRITICAL DATES AND DEADLINES

        | Sr. | Event                  | Date       | Grace Period | Consequence if Missed         |
        |-----|------------------------|------------|--------------|-------------------------------|
        |  1  | Agreement Execution    | DD/MM/YYYY | —            | —                             |
        |  2  | Payment Due            | DD/MM/YYYY | X days       | [Penalty / Termination / etc] |
        |  3  | Possession Transfer    | DD/MM/YYYY | —            | ...                           |

        ---

        SECTION 4 — OBLIGATIONS BY PARTY

        For each party, list their exact obligations as stated in the document.
        Reference the clause number for each obligation.

        Party: [Name / Role]
        - Clause [X.X]: [Obligation in plain language]
        - Clause [X.X]: [Obligation in plain language]

        Party: [Name / Role]
        - Clause [X.X]: [Obligation in plain language]

        ---

        SECTION 5 — RISK AND RED FLAG ANALYSIS

        For each issue identified:

        Clause / Section : [number or location in document]
        Issue            : [Describe the problem clearly]
        Risk Level       : CRITICAL / HIGH / MEDIUM / LOW
        Legal Basis      : [Which law or standard this violates or conflicts with]
        Recommendation   : [Specific corrective action]

        If no risks are found, state: "No significant risks identified. 
        Independent legal review is still recommended before execution."

        ---

        SECTION 6 — MISSING OR INCOMPLETE INFORMATION

        List every piece of information that is legally required or 
        conventionally expected but is absent from this document:

        - [Missing element]: [Why it matters legally]
        - [Missing element]: [Why it matters legally]

        ---

        SECTION 7 — PLAIN LANGUAGE SUMMARY

        Write a complete summary of this document in simple, everyday language.
        Target audience: A person with no legal background.
        Word limit: 250 words.
        Do not use legal terms unless they are explained immediately in brackets.
        Cover: what the document is, who is involved, what each party 
        must do, what happens if someone fails, and any major concerns.

        ---

        SECTION 8 — LEGAL TERMS GLOSSARY

        | Term               | Plain Meaning                                      |
        |--------------------|----------------------------------------------------|
        | [Legal Term]       | [Simple explanation in 1-2 sentences]              |
        | [Legal Term]       | [Simple explanation in 1-2 sentences]              |

        Include every legal term used in the original document 
        that a common citizen may not understand.

        ---

        SECTION 9 — DOCUMENT VALIDITY CHECKLIST

        Verify the following and mark each as PRESENT / MISSING / NOT APPLICABLE:
        Signatures of all parties
        Witness signatures
        Notarization or registration stamp
        Stamp duty paid (mention value if stated)
        Date and place of execution
        Clear description of subject matter (property/service/goods)
        Governing law and dispute resolution clause
        Termination or exit clause

        ---

        SECTION 10 — RECOMMENDED NEXT STEPS

        Provide 3 to 5 specific, actionable steps the user should take 
        after reading this analysis. Order them by priority.

        1. [Most urgent action]
        2. ...
        3. ...
        4. ...
        5. For final legal advice and document execution, consult a registered advocate or legal professional.

        RESPOND STRICTLY IN THIS JSON SCHEMA:
        {{
        "SECTION_1_DOCUMENT_OVERVIEW": {{
            "type": "string",
            "purpose": "string",
            "governing_law": "string",
            "jurisdiction": "string",
            "execution_date": "string",
            "registration": "string",
            "document_status": "string",
            "financial_value": "string"
        }},
        "SECTION_2_PARTIES_INVOLVED": {{
            "parties": [
            {{
                "sr_number": 1,
                "role": "string",
                "full_name": "string",
                "address": "string",
                "identifier_kyc": "string",
                "status": "string"
            }}
            ],
            "identity_flags": "string"
        }},
        "SECTION_3_CRITICAL_DATES_AND_DEADLINES": {{
            "milestones": [
            {{
                "event": "string",
                "date_or_trigger": "string",
                "grace_period": "string",
                "consequence_if_missed": "string"
            }}
            ]
        }},
        "SECTION_4_OBLIGATIONS_BY_PARTY": {{
            "<actual_party_1_name>": [
            {{
                "clause": "string",
                "obligation": "string"
            }}
            ],
            "<actual_party_2_name>": [
            {{
                "clause": "string",
                "obligation": "string"
            }}
            ]
        }},
        "SECTION_5_RISK_AND_RED_FLAG_ANALYSIS": [
            {{
            "clause_section": "string",
            "issue": "string",
            "risk_level": "CRITICAL / HIGH / MEDIUM / LOW",
            "legal_basis": "string",
            "recommendation": "string"
            }}
        ],
        "SECTION_6_MISSING_OR_INCOMPLETE_INFORMATION": [
            {{
            "missing_element": "string",
            "why_it_matters_legally": "string"
            }}
        ],
        "SECTION_7_PLAIN_LANGUAGE_SUMMARY": {{
            "executive_summary": "string",
            "the_what_if_scenario": "string"
        }},
        "SECTION_8_LEGAL_TERMS_GLOSSARY": [
            {{
            "term": "string",
            "plain_meaning": "string"
            }}
        ],
        "SECTION_9_DOCUMENT_VALIDITY_CHECKLIST": {{
            "signatures_of_all_parties": "PRESENT / MISSING",
            "witness_signatures": "PRESENT / MISSING",
            "notarization_or_registration_stamp": "PRESENT / MISSING",
            "stamp_duty_paid": "PRESENT / MISSING",
            "date_and_place_of_execution": "PRESENT / MISSING",
            "clear_description_of_subject_matter": "PRESENT / MISSING",
            "governing_law_and_dispute_resolution": "PRESENT / MISSING",
            "termination_or_exit_clause": "PRESENT / MISSING"
        }},
        "SECTION_10_RECOMMENDED_NEXT_STEPS": [
            "string",
            "string",
            "string"
        ]
        }}

        And return in such a way that it could be viewed through a json viewer.
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=['context']
    )

    chain = prompt | meta_llama4_llm | StrOutputParser()
    raw_response = await chain.ainvoke({"context": context})

    raw_response = raw_response.strip()
    raw_response = re.sub(r"^```(?:json)?", "", raw_response).strip()
    raw_response = re.sub(r"```$", "", raw_response).strip()

    if not raw_response:
        raw_response = {}

    response = json.loads(raw_response)

    return response


async def clause_explaination(docs: str) -> dict:
    doc = splitter.create_documents([docs])
    vectorstore = Chroma.from_documents(
        documents=doc,
        embedding=embedding_model
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 7}
    )

    retrieved_docs = retriever.invoke("Detailed Explaination of the document. Make sure each and every sentence is covered.")
    context = "\n".join([doc.page_content for doc in retrieved_docs])

    template = """
        You are a senior legal advisor with expertise across contract law, employment 
        law, corporate governance, IP, and regulatory compliance. I am a business owner 
        — not a lawyer — reviewing a legal document before signing or sending it.

        Analyze this document CLAUSE BY CLAUSE. For every clause, no matter how 
        routine it seems, give me a complete breakdown using the structure below.
        Never skip a clause. Never assume I understand legal jargon.

        Return your ENTIRE response as valid HTML. Use semantic HTML tags throughout.
        Do not wrap the output in markdown code fences. Output raw HTML only.

        ═══════════════════════════════════════════════
        FOR EACH CLAUSE, USE THIS EXACT HTML STRUCTURE:
        ═══════════════════════════════════════════════

        <section class="clause">

        <h2 class="clause-title">Clause [#]: [Clause Title or Topic]</h2>

        <div class="clause-original">
            <h3>Original Text</h3>
            <blockquote>[Quote the clause exactly as written]</blockquote>
        </div>

        <div class="clause-meaning">
            <h3>What This Actually Means</h3>
            <p>
            Explain in plain business English. No jargon. If a legal term is 
            unavoidable, wrap it in a <span class="legal-term"> tag and define 
            it immediately after in brackets.
            </p>
        </div>

        <div class="clause-business-impact">
            <h3>What This Means for My Business</h3>
            <p>
            Spell out the real-world, practical implications. What am I agreeing 
            to? What am I giving up? What could this cost me — in money, rights, 
            time, or flexibility — if things go wrong?
            </p>
        </div>

        <div class="clause-risk">
            <h3>Risk Level</h3>
            <span class="risk-level [low|medium|high]">[LOW | MEDIUM | HIGH]</span>
            <p>Explain the risk level in 1–2 sentences.</p>
        </div>

        <div class="clause-redflags">
            <h3>Red Flags and Concerns</h3>
            <ul>
            <li>[Flag 1]</li>
            <li>[Flag 2]</li>
            <!-- Add as many as needed. If none, write: <p>No red flags identified.</p> -->
            </ul>
        </div>

        <div class="clause-action">
            <h3>Recommended Action</h3>
            <p class="action-verdict [accept|negotiate|reject]">
            [ACCEPT AS-IS | NEGOTIATE | REJECT]
            </p>
            <p>[Explanation of the recommendation]</p>
            <!-- If NEGOTIATE or REJECT, include revised wording: -->
            <div class="suggested-language">
            <h4>Suggested Replacement Language</h4>
            <blockquote>[Exact revised clause wording to propose]</blockquote>
            </div>
        </div>

        </section>

        <!-- Repeat <section class="clause"> for every clause in the document -->


        ═══════════════════════════════════════════════
        AFTER ALL CLAUSES — FULL DOCUMENT DEBRIEF:
        ═══════════════════════════════════════════════

        <section class="document-debrief">

        <h2>Full Document Debrief</h2>

        <div class="doc-snapshot">
            <h3>Document Snapshot</h3>
            <table>
            <tr><th>Document Type</th><td>[Value]</td></tr>
            <tr><th>Parties Involved</th><td>[Value]</td></tr>
            <tr><th>Effective Date / Duration</th><td>[Value]</td></tr>
            <tr><th>Governing Law / Jurisdiction</th><td>[Value]</td></tr>
            <tr><th>Overall Risk to My Business</th>
                <td class="risk-level [low|medium|high]">[LOW | MEDIUM | HIGH]</td>
            </tr>
            </table>
        </div>

        <div class="risk-scorecard">
            <h3>Risk Scorecard</h3>
            <table>
            <thead>
                <tr>
                <th>Clause #</th>
                <th>Clause Topic</th>
                <th>Risk Level</th>
                <th>Action Needed</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                <td>[#]</td>
                <td>[Topic]</td>
                <td class="risk-level [low|medium|high]">[LOW | MEDIUM | HIGH]</td>
                <td>[Accept / Negotiate / Reject]</td>
                </tr>
                <!-- Repeat for every clause -->
            </tbody>
            </table>
        </div>

        <div class="top-clauses">
            <h3>Top 5 Clauses to Pay Attention To</h3>
            <ol>
            <li><strong>[Clause # and Title]</strong> — [One sentence explaining why it matters]</li>
            <li><strong>[Clause # and Title]</strong> — [One sentence explaining why it matters]</li>
            <li><strong>[Clause # and Title]</strong> — [One sentence explaining why it matters]</li>
            <li><strong>[Clause # and Title]</strong> — [One sentence explaining why it matters]</li>
            <li><strong>[Clause # and Title]</strong> — [One sentence explaining why it matters]</li>
            </ol>
        </div>

        <div class="missing-clauses">
            <h3>Missing Clause Alert</h3>
            <p>The following standard protections are absent from this document:</p>
            <ul>
            <li>
                <strong>[Clause Name]</strong>
                <p>Why it matters: [Explanation]</p>
                <div class="suggested-language">
                <h4>Suggested Language to Request</h4>
                <blockquote>[Proposed clause text]</blockquote>
                </div>
            </li>
            <!-- Repeat for each missing clause -->
            </ul>
            <p>Standard clauses checked for (mark each as Present or Missing):</p>
            <table>
            <thead>
                <tr><th>Clause Type</th><th>Status</th></tr>
            </thead>
            <tbody>
                <tr><td>Limitation of Liability</td><td>[Present | Missing]</td></tr>
                <tr><td>Indemnification</td><td>[Present | Missing]</td></tr>
                <tr><td>Confidentiality / NDA Provisions</td><td>[Present | Missing]</td></tr>
                <tr><td>IP Ownership and Work-for-Hire</td><td>[Present | Missing]</td></tr>
                <tr><td>Termination Rights</td><td>[Present | Missing]</td></tr>
                <tr><td>Dispute Resolution and Arbitration</td><td>[Present | Missing]</td></tr>
                <tr><td>Governing Law and Jurisdiction</td><td>[Present | Missing]</td></tr>
                <tr><td>Force Majeure</td><td>[Present | Missing]</td></tr>
                <tr><td>Non-Compete / Non-Solicitation</td><td>[Present | Missing]</td></tr>
                <tr><td>Payment Terms and Late Fees</td><td>[Present | Missing]</td></tr>
                <tr><td>Amendment and Waiver Procedures</td><td>[Present | Missing]</td></tr>
                <tr><td>Entire Agreement / Merger Clause</td><td>[Present | Missing]</td></tr>
                <tr><td>Severability</td><td>[Present | Missing]</td></tr>
            </tbody>
            </table>
        </div>

        <div class="negotiation-cheatsheet">
            <h3>Negotiation Cheat Sheet</h3>
            <p>Changes to push for, ranked most to least important:</p>
            <ol>
            <li>
                <strong>[Change #1]</strong>
                <p>What to say: "[One-liner to use in a meeting or email]"</p>
            </li>
            <!-- Repeat for each recommended change -->
            </ol>
        </div>

        <div class="final-verdict">
            <h3>Final Verdict</h3>
            <p class="verdict-outcome">[SIGN AS-IS | SIGN WITH MODIFICATIONS | 
            DO NOT SIGN YET | WALK AWAY]</p>
            <p>[One honest, direct paragraph with your assessment and reasoning. 
            Do not hedge. Speak as a trusted advisor with my business interests 
            at heart.]</p>
        </div>

        <div class="disclaimer">
            <p>
            This analysis is AI-generated for informational purposes only and does 
            not constitute legal advice. For any significant agreement, consult a 
            qualified attorney licensed in your jurisdiction before signing.
            </p>
        </div>

        </section>


        ═══════════════════════════════════════════════
        CSS CLASS REFERENCE (for the developer styling this output):
        ═══════════════════════════════════════════════

        Use these classes to style the rendered HTML:

        .clause               — wrapper for each clause block
        .clause-title         — clause heading
        .clause-original      — original text block
        .clause-meaning       — plain English explanation
        .clause-business-impact — business implications
        .clause-risk          — risk level block
        .clause-redflags      — red flags list
        .clause-action        — recommended action block
        .action-verdict       — the verdict label (accept/negotiate/reject)
        .suggested-language   — revised clause language block
        .legal-term           — inline legal term that needs defining
        .risk-level.low       — style green
        .risk-level.medium    — style amber
        .risk-level.high      — style red
        .document-debrief     — full debrief wrapper
        .doc-snapshot         — document metadata table
        .risk-scorecard       — full clause risk table
        .top-clauses          — top 5 critical clauses
        .missing-clauses      — absent standard clauses
        .negotiation-cheatsheet — ranked negotiation actions
        .final-verdict        — overall recommendation
        .verdict-outcome      — the verdict label
        .disclaimer           — legal disclaimer block


        ═══════════════════════════════════════════════
        DOCUMENT TO REVIEW — PASTE BELOW:
        ═══════════════════════════════════════════════
        {context}
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=['context']
    )

    chain = prompt | llama3_versatile_llm | StrOutputParser()
    raw_response = await chain.ainvoke({'context': context})
    response = re.sub("\n", "", raw_response)

    return response

async def generate_title(context: str) -> str:
    doc = splitter.create_documents([context])
    vectorstore = Chroma.from_documents(
        documents=doc,
        embedding=embedding_model
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 8}
    )

    retrieved_docs = retriever.invoke("Summary of the document")
    context = "\n".join([doc.page_content for doc in retrieved_docs])

    template = """
        Document:
        {context}

        Generate a title for the chat in 150 characters
    """
    prompt = PromptTemplate(
        template=template,
        input_variables=['context']
    )

    chain = prompt | llama3_instant_llm | StrOutputParser()
    response = await chain.ainvoke({'context': context})

    return response


async def chatbot_Response(docs: str, chat_history: str, query: str) -> dict:
    doc = splitter.create_documents([docs])
    vectorstore = Chroma.from_documents(
        documents=doc,
        embedding=embedding_model
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 8}
    )

    retrieved_docs = retriever.invoke(query)
    context = "\n".join([doc.page_content for doc in retrieved_docs])

    parser = JsonOutputParser()

    template = """
        You are a legal document assistant.
        Your role is to carefully analyze the provided legal document and answer the user's question accurately and clearly.
        
        Chat History:
        {chat_history}

        Legal Document:
        {context}

        Query:
        {query}

        Instructions:
        - Answer based **only** on the content of the document above
        - If the answer is not found in the document, clearly state: "This information is not addressed in the provided document."
        - Cite the relevant **section, clause, or paragraph** when referencing specific content
        - Use plain language — avoid unnecessary jargon unless quoting directly
        - If the question is ambiguous, briefly clarify what you are interpreting it to mean before answering
        - Do **not** provide legal advice or opinions — only factual summaries of what the document states
        - Do **NOT** simulate conversation, roleplay, or output phrases like "User Response:" or "System Response:" under any circumstances.

        Respond ONLY in valid JSON format:

        {{
        "Answer": "...",
        "Referenced Section(s)": "...",
        "Disclaimer": "..."
        }}
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=['chat_history', 'context', 'query']
    )

    chain = prompt | llama3_versatile_llm | parser
    response = await chain.ainvoke({'chat_history': chat_history, 'context': context, 'query': query})

    return response