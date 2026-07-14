// ============================================================
// audio-clips.js — registers RECORDED clips (ElevenLabs, voice "Jessica" —
// warm/bright/playful young-American) into LumiAudio's clip seam, so the child
// hears a real voice instead of the browser's robotic TTS. Keyed by the exact
// text the mechanics pass to LumiAudio.english(...). Anything unmapped falls
// back to TTS automatically (see audio.js).
// ============================================================
(function () {
  'use strict';
  if (!window.LumiAudio || !LumiAudio.clipMap) return;
  var base = 'assets/audio/words/';
  var clips = {
    'dog': 'dog', 'cat': 'cat', 'fish': 'fish', 'bird': 'bird', 'rabbit': 'rabbit',
    'cow': 'cow', 'horse': 'horse', 'duck': 'duck', 'pig': 'pig', 'sheep': 'sheep',   // farm (T1)
    'lion': 'lion', 'elephant': 'elephant', 'monkey': 'monkey', 'bear': 'bear',   // wild (T2 · Safari Beam)
    'happy': 'happy', 'sad': 'sad', 'scared': 'scared',
    'tired': 'tired', 'surprised': 'surprised', 'okay': 'okay',   // emotions (T3 · Find the Feeling)
    'I\'m happy!': 'im-happy', 'I\'m sad!': 'im-sad', 'I\'m scared!': 'im-scared',
    'I\'m tired!': 'im-tired', 'I\'m surprised!': 'im-surprised', 'I\'m okay!': 'im-okay',   // "I'm ___" chunk
    'red': 'red', 'blue': 'blue', 'yellow': 'yellow', 'green': 'green', 'orange': 'orange',
    'purple': 'purple', 'pink': 'pink', 'black': 'black', 'white': 'white', 'brown': 'brown',   // colors (T4 · Color the Grove)
    'one': 'one', 'two': 'two', 'three': 'three', 'four': 'four', 'five': 'five',
    'six': 'six', 'seven': 'seven', 'eight': 'eight', 'nine': 'nine', 'ten': 'ten',   // numbers (T5 · Count the Lanterns)
    'Go!': 'go', 'Stop!': 'stop', 'Come!': 'come', 'Jump!': 'jump',
    'Look!': 'look', 'Listen!': 'listen', 'Point!': 'point',
    'Say it!': 'say-it', 'Find it!': 'find-it', 'Touch it!': 'touch-it',   // action & instruction (T6 · Lumi Says)
    'You did it!': 'you-did-it',
    'You found it!': 'praise',
    'Let’s listen again': 'listen-again',   // curly apostrophe — matches _measured-core
    'Let\'s listen again': 'listen-again',        // straight apostrophe fallback
    // greetings & friends (T7 · Lantern of Hello) — keyed to the exact strings the
    // meet/produce mechanics speak. Both the display phrase ("Hello!") and the bare
    // target word ("hello", used by produce/recognize) map to the same recorded clip.
    'Hello!': 'hello', 'hello': 'hello',
    'Hi!': 'hi', 'hi': 'hi',
    'Bye!': 'bye', 'bye': 'bye',
    'Please!': 'please', 'please': 'please',
    'Thank you!': 'thankyou', 'thank you': 'thankyou',
    'Yes!': 'yes', 'yes': 'yes',
    'No!': 'no', 'no': 'no',
    'Sorry!': 'sorry', 'sorry': 'sorry',
    'Hi there!': 'hi-there',
    'Bye-bye!': 'bye-bye',
    'Yes, please!': 'yes-please',
    'Thank you so much!': 'thankyou-much',
    'No, thank you.': 'no-thankyou',
    'I\'m sorry.': 'greet-im-sorry',
    'my name is': 'greet-myname', 'Hello! My name is…': 'greet-myname', 'Hello! My name is...': 'greet-myname',
    'Nice!': 'nice',
    'Nice to meet you!': 'nice-meet',
    // face (T10 · Light Up the Face) — bare part word (recognize/discriminate),
    // the "Touch your ___." TPR chunk (comprehend), and the "This is my ___" mirror chunk.
    'eyes': 'eyes', 'nose': 'nose', 'mouth': 'mouth', 'ears': 'ears',
    'Touch your eyes.': 'touch-eyes', 'Touch your nose.': 'touch-nose',
    'Touch your mouth.': 'touch-mouth', 'Touch your ears.': 'touch-ears',
    'These are my eyes!': 'chunk-eyes', 'This is my nose!': 'chunk-nose',
    'This is my mouth!': 'chunk-mouth', 'These are my ears!': 'chunk-ears',
    // body (T11 · Touch & Go / TPR) — bare part word (recognize/discriminate + path-choice
    // target), the "Touch your ___." TPR chunk (comprehend), and the "This is my ___" mirror chunk.
    'head': 'head', 'hair': 'hair', 'hands': 'hands', 'feet': 'feet',
    'Touch your head.': 'touch-head', 'Touch your hair.': 'touch-hair',
    'Touch your hands.': 'touch-hands', 'Touch your feet.': 'touch-feet',
    'This is my head!': 'chunk-head', 'This is my hair!': 'chunk-hair',
    'These are my hands!': 'chunk-hands', 'These are my feet!': 'chunk-feet',
    // fruits (T8 · The Fruit Basket) — 'orange' already mapped above (shared w/ T4).
    'apple': 'apple', 'banana': 'banana',
    'I want an apple.': 'iwant-apple', 'I want a banana.': 'iwant-banana', 'I want an orange.': 'iwant-orange',
    // family (T12 · The Family Photo) — bare word (recognize/discriminate/meet),
    // the "Where is my ___?" scene-hide chunk (comprehend), and the "This is my ___!"
    // warm naming spoken when a family member is found. Both "Mum." and "mum" map to one clip.
    'mum': 'mum', 'Mum.': 'mum', 'dad': 'dad', 'Dad.': 'dad', 'baby': 'baby', 'Baby.': 'baby',
    'brother': 'brother', 'Brother.': 'brother', 'sister': 'sister', 'Sister.': 'sister',
    'grandma': 'grandma', 'Grandma.': 'grandma', 'grandpa': 'grandpa', 'Grandpa.': 'grandpa',
    'Where is my mum?': 'where-mum', 'Where is my dad?': 'where-dad', 'Where is the baby?': 'where-baby',
    'Where is my brother?': 'where-brother', 'Where is my sister?': 'where-sister',
    'Where is my grandma?': 'where-grandma', 'Where is my grandpa?': 'where-grandpa',
    'This is my mum!': 'this-mum', 'This is my dad!': 'this-dad', 'This is the baby!': 'this-baby',
    'This is my brother!': 'this-brother', 'This is my sister!': 'this-sister',
    'This is my grandma!': 'this-grandma', 'This is my grandpa!': 'this-grandpa',
    'I love you!': 'ilove',
    // measured comprehend / chunk prompts (scene-hide "Where is…", TPR "Find the…",
    // numbers "How many?…") — these are MEASURED, so a recorded voice matters most here.
    'Where is the dog?': 'where-the-dog', 'Where is the cat?': 'where-the-cat',
    'Where is the cow?': 'where-the-cow', 'Where is the lion?': 'where-the-lion',
    'Find the duck.': 'find-the-duck', 'Find the monkey.': 'find-the-monkey', 'Find the ball.': 'find-the-ball',
    'How many? Two.': 'howmany-two', 'How many? Three.': 'howmany-three', 'How many? Five.': 'howmany-five',
    'How many? Seven.': 'howmany-seven', 'How many? Ten.': 'howmany-ten',
    // snacks & meal (T9 · Lumi's Picnic) — bare word (recognize/discriminate/meet), the
    // "I want ___" scene-hide chunk (comprehend, MEASURED), and the warm "Here is the ___!"
    // naming spoken when the food is found. Both "Bread." and "bread" map to one clip.
    'bread': 'bread', 'Bread.': 'bread', 'egg': 'egg', 'Egg.': 'egg', 'cake': 'cake', 'Cake.': 'cake',
    'milk': 'milk', 'Milk.': 'milk', 'water': 'water', 'Water.': 'water',
    'I want bread.': 'iwant-bread', 'I want an egg.': 'iwant-egg', 'I want cake.': 'iwant-cake',
    'I want milk.': 'iwant-milk', 'I want water.': 'iwant-water',
    'Here is the bread!': 'here-bread', 'Here is the egg!': 'here-egg', 'Here is the cake!': 'here-cake',
    'Here is the milk!': 'here-milk', 'Here is the water!': 'here-water',
    'I\'m hungry!': 'im-hungry',
  };
  Object.keys(clips).forEach(function (text) {
    LumiAudio.clipMap[text] = base + clips[text] + '.mp3';
  });
})();
