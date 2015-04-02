from documentcloud import DocumentCloud
from app import sort_keys

module = __import__("contract_parser")
client = DocumentCloud()


def tokenize(doc_cloud_id):
    """
    Breaks a document into tokens based on the module's tokenizer
    """
    ids = {}
    doc = client.documents.get(doc_cloud_id)
    pages = doc.pages
    for x in range(1, pages + 1):
        counter = 0
        tokens = module.tokenize(doc.get_page_text(x))
        for t in tokens:
            tokenid = str(x) + "-" + str(counter)
            counter += 1
            ids[tokenid] = t
    return ids

doc_cloud_id = "1699212-ochsner-clinic-foundation-ochsner-cea-to-provide"

tokens = tokenize(doc_cloud_id)

for t in sort_keys(tokens.keys()):
	print t, tokens[t]