import gensim.downloader as api
import csv
from nltk.tokenize import RegexpTokenizer
from nltk.corpus import stopwords
import json
from fireadmin import put_words_in_firestore


# model = api.load("glove-wiki-gigaword-200")  # download the model and return as object ready for use
# x = model.similar_by_key("coffee", topn=None)
# print(x)

N_WORDS = 400000

def main():
    vibes = load_vibes()
    # Save vibes
    with open("/Users/fosterangus/Documents/Code/apollo-vec-search/functions/pydata/vibes.json", "w") as f:
        json.dump(vibes, f)

    model = api.load("glove-wiki-gigaword-200")
    print('model loaded')
    words = [[] for i in range(N_WORDS)]
    gen_data(model, vibes, words)

    words_dict = build_dict(model, words, vibes)

    put_words_in_firestore(words_dict)

    

def load_vibes():
    fname = "/Users/fosterangus/Documents/Code/apollo-vec-search/functions/pydata/Vibe Names and Keywords - Sheet1.csv"
    with open(fname, 'r') as f:
        reader = csv.DictReader(f)
        vibes = []
        for row in reader:
            row['combined'] = row['Name'] + " " + row['Description'] + " " + row['Keywords']
            vibes.append(row)
    preprocess_data(vibes)
    return vibes

def preprocess_data(vibes):
    # initialize regex tokenizer
    tokenizer = RegexpTokenizer(r'\w+')
    # create English stop words list
    en_stop = set(stopwords.words('english'))
    # loop through document list
    for vibe in vibes:
        # clean and tokenize document string
        raw = vibe['combined'].lower()
        tokens = tokenizer.tokenize(raw)
        # remove stop words from tokens
        stopped_tokens = {i for i in tokens if not i in en_stop}

        stopped_tokens = list(stopped_tokens)

        vibe['words'] = stopped_tokens

def gen_data(model, vibes, words):
    for vibe in vibes:
        process_vibe(vibe, model, words)

def process_vibe(vibe, model, words):
    similarity_matrix = []
    for word in vibe['words']:
        similarity_matrix.append(model.similar_by_key(word, topn=None))
    
    for word_index in range(N_WORDS):
        word_sims = []
        for vibe_word_index in range(len(similarity_matrix)):
            word_sims.append(similarity_matrix[vibe_word_index][word_index])
        max_sim = float(max(word_sims))
        words[word_index].append(max_sim)

def build_dict(model, words, vibes):

    word_dict = {}

    for word_index in range(len(words)):
        word = model.index_to_key[word_index]
        word_dict[word] = {
            "word": word,
            "sims": []
        }

        word_sims = words[word_index]
        for i in range(len(word_sims)):
            word_dict[word]["sims"].append(
                {
                    "vibe_name": vibes[i]["Name"],
                    "vibe_sim": word_sims[i]
                }
            )
    return word_dict

if __name__ == '__main__':
    main()