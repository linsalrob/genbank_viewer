# Qualifiers

GenBank qualifiers are key/value annotations attached to features. They are distinct from feature keys and from genbank_viewer's display groups. The parser retains qualifiers in source order, including repeated qualifiers and qualifiers without a value. Expand **All qualifiers** in the **Feature inspector** to view them.

| Qualifier | Typical meaning in the viewer |
|---|---|
| `/gene` | Gene symbol; candidate feature label |
| `/locus_tag` | Stable locus identifier; highest-priority feature label |
| `/product` | RNA or protein product; candidate feature label |
| `/protein_id` | Protein identifier; candidate feature label |
| `/translation` | Translation supplied by the record; displayed, not recomputed as validation |
| `/transl_table` | NCBI genetic-code number declared by a feature |
| `/function` | Free-text functional assignment |
| `/EC_number` | Enzyme Commission identifier |
| `/db_xref` | External database cross-reference |
| `/regulatory_class` | Regulatory subtype and preferred label for `regulatory` features |
| `/rpt_type`, `/rpt_family` | Repeat classification |
| `/mobile_element_type` | Mobile-element subtype and preferred label |
| `/organism`, `/mol_type` | Source organism and molecule type |
| `/host`, `/isolation_source`, `/country`, `/collection_date` | Sample/source context |
| `/note` | General annotation text |

The viewer promotes only a small subset into labelled inspector fields. All other qualifiers remain available in **All qualifiers**. Their presence is not proof that their values have been biologically or syntactically validated.
