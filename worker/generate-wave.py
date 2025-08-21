import requests
import os
import json

print("Script started")

# 7B-U2-B-1b

sentences_with_ids = [
    ("7B-U2-B-1b-01", "A1", "Dear Dr. Know,"),
    ("7B-U2-B-1b-02", "A1", "Help! There are too many rules in my life!"),
    # ("7B-U2-B-1b-03", "A1", "Every morning, I have to make my bed before breakfast."),
    # ("7B-U2-B-1b-04", "A1", "I have to hurry to school because I can't be late for school."),
    # ("7B-U2-B-1b-05", "A1", "When I'm at school, I mustn't use my phone in class either."),
    # ("7B-U2-B-1b-06", "A1", "And I have to wear the uniform."),
    # ("7B-U2-B-1b-07", "A1", "After school, there are even more rules!"),
    # ("7B-U2-B-1b-08", "A1", "I have to finish my homework first."),
    # ("7B-U2-B-1b-09", "A1", "I can only play basketball after I practise the piano."),
    # ("7B-U2-B-1b-10", "A1", "I can't hang out with my friends on weekdays."),
    # ("7B-U2-B-1b-11", "A1", "I know some rules are important, but this is awful!"),
    # ("7B-U2-B-1b-12", "A1", "What can I do?"),
    # ("7B-U2-B-1b-13", "A1", "Yours, Alice"),
    ("7B-U2-B-1b-15", "B1", "Dear Alice,"),
    ("7B-U2-B-1b-16", "B1", "Yes, there are many rules in life!"),
    # ("7B-U2-B-1b-17", "B1", "But they can help you to become a better person."),
    # ("7B-U2-B-1b-18", "B1", "You mustn't be late for class."),
    # ("7B-U2-B-1b-19", "B1", "That shows respect for your class and teacher."),
    # ("7B-U2-B-1b-20", "B1", "You can't use your phone in class because you need to focus on learning."),
    # ("7B-U2-B-1b-21", "B1", "You have to wear a uniform because it builds school spirit."),
    # ("7B-U2-B-1b-22", "B1", "You can also think about the things you can do!"),
    # ("7B-U2-B-1b-23", "B1", "You can use your phone at home."),
    # ("7B-U2-B-1b-24", "B1", "You can relax after you finish your homework."),
    # ("7B-U2-B-1b-25", "B1", "And you can hang out with friends at weekends!"),
    # ("7B-U2-B-1b-26", "B1", "I know it's hard, but rules can help to make the world better."),
    # ("7B-U2-B-1b-27", "B1", "Remember: No rules, no order!"),
    # ("7B-U2-B-1b-28", "B1", "Best, Dr. Know"),
]

updated_sentences = []

voice_list = {
    "A1": 3333,
    "B1": 6653
}


for sentence_id, character, sentence in sentences_with_ids:
  voice_id = voice_list.get(character, 3333)
  print(f"Processing sentence {sentence_id}: {sentence}")
  res = requests.post('http://127.0.0.1:9966/tts', data={
      "text": sentence,
      "prompt": "",
      "voice": str(voice_id),
      "temperature": 0.3,
      "top_p": 0.7,
      "top_k": 20,
      "refine_max_new_token": "384",
      "infer_max_new_token": "2048",
      "skip_refine": 1,
      "is_split": 1,
      "custom_voice": 0
  })
  data = res.json()
  if data["code"] == 0:
      # Extract filename without path and extension
      full_filename = data["audio_files"][0]["filename"]
      base_filename = os.path.splitext(os.path.basename(full_filename))[0]
      updated_sentences.append( (sentence_id, character, sentence, base_filename) )
      print(f"Saved: {base_filename}")
  else:
      updated_sentences.append( (sentence_id, character, sentence, "error") )
      print(f"API returned error for {sentence_id}: {data['msg']}")



for item in updated_sentences:
    print(item)



# Save to JSON file in your desired structure
output = {
    "text_id": "7B-U2-B-1b",
    "sentences": updated_sentences
}

with open("7B-U2-B-1b.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Saved to 7B-U2-B-1b.json")

print("All done.")