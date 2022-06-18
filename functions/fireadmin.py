import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from nltk.corpus import stopwords

# Use a service account
cred = credentials.Certificate('/Users/fosterangus/Documents/Code/apollo-vec-search/firebase-creds/apollovibesearch-fire-key.json')
firebase_admin.initialize_app(cred)

db = firestore.client()
en_stop = set(stopwords.words('english'))

def put_words_in_firestore(words_dict):
    coll_ref = db.collection('words')

    i = 0
    x = 0
    batch = db.batch()
    for key, value in words_dict.items():
    
        i += 1
        x += 1

        if i == 500:
            batch.commit()
            batch = db.batch()
            i = 0

        if not all(c.isalpha() for c in key) or key in en_stop:
            continue

        doc_ref = coll_ref.document(key)
        batch.set(doc_ref, value)
        # doc_ref.set(value)