/**
 * THE CAST
 *
 * Twelve people who will not go home, and what they sound like.
 *
 * This file is deliberately just data. Everyone on the team can add a line
 * without touching a system, and every line is attributable to one person in
 * one situation — a shared "guest barks" pool would make them interchangeable,
 * which is the opposite of the point.
 *
 * Two rules held throughout:
 *   1. A bark never names what the guest is secretly drawn to. Gary can love
 *      the speaker out loud; he must never say "I am drawn to bass".
 *   2. Every character is funny in a way that is also a little sad. That is
 *      what makes a player want to know them rather than just clear them.
 */

export type BarkTrigger =
  | 'idle'
  | 'lured'
  | 'flee'
  | 'raid'
  | 'dancing'
  | 'nudged'
  | 'shoved'
  | 'mutate'
  | 'leaving'
  | 'gone';

export interface GuestProfile {
  /** Always visible. The hook that makes you curious. */
  tagline: string;
  /** Unlocked one at a time as you spend hours near them. */
  dossier: readonly string[];
  lines: Partial<Record<BarkTrigger, readonly string[]>>;
  /** Said only when standing next to a particular other guest. */
  aboutOthers?: Record<string, readonly string[]>;
}

export const CAST: Record<string, GuestProfile> = {
  'guest-gary': {
    tagline: 'Your upstairs neighbour. Came down to complain.',
    dossier: [
      'Gary knocked on hour four to ask you to turn it down. He is still here.',
      'He has told the same story about a canoe to four different people.',
      'He has not been to work since Tuesday. He does not seem worried about this.',
      'There is a cat in his flat. He mentions it once, quietly, then changes the subject.',
    ],
    lines: {
      idle: [
        'Gary asks if anyone else can hear a canoe.',
        '"Great party. Great, great party."',
        'Gary checks his phone, sees nothing, puts it away, checks it again.',
      ],
      lured: [
        '"Oh, that\'s the good stuff. That is the GOOD stuff."',
        'Gary makes a small happy noise and follows the sound.',
        '"Don\'t mind me. I\'m just going to stand right here."',
      ],
      raid: ['"I\'ll just have a look in the kitchen. Just a look."'],
      dancing: [
        'Gary is dancing. It is more of a controlled fall.',
        '"THIS IS MY SONG." It is not his song.',
        'Gary dances like a man who has forgotten anyone can see him.',
      ],
      nudged: ['"Alright, alright, I\'m moving, I\'m moving."'],
      shoved: ['"Woah — hey. Okay. Message received."'],
      mutate: ['Gary\'s laugh has gone wrong somewhere in the middle.'],
      leaving: ['"Is it — oh. Is it that time? Already?"'],
      gone: ['Gary waves at the house from the pavement. Nobody waves back.'],
    },
    aboutOthers: {
      'guest-denise': ['Gary goes very quiet whenever Denise looks at him.'],
    },
  },

  'guest-denise': {
    tagline: 'Somehow the only sober person here.',
    dossier: [
      'Denise has been taking mental notes since hour one. She has not said why.',
      'She knows where you keep the bin bags. You have never told her.',
      'She has quietly washed up twice. Neither time did anyone notice.',
      'She was supposed to be at her sister\'s on Sunday. It is Tuesday.',
    ],
    lines: {
      idle: [
        'Denise watches the room the way you\'d watch a pan about to boil.',
        '"Fascinating," says Denise, to nobody.',
        'Denise straightens something nobody else noticed was crooked.',
      ],
      lured: [
        'Denise moves toward it without appearing to hurry.',
        '"I was going that way anyway."',
        'Denise has already decided this was her idea.',
      ],
      raid: [
        '"There is a system to this kitchen and I intend to find it."',
        'Denise eats standing up, judging everything.',
      ],
      dancing: ['Denise dances precisely, like she is following a diagram.'],
      nudged: ['"I saw you coming."'],
      shoved: ['Denise does not fall. She simply relocates, and remembers this.'],
      mutate: ['Denise is still taking notes. The handwriting has changed.'],
      leaving: ['"Right. Well. Thank you for having me."'],
      gone: ['Denise leaves without hurrying, and takes a bin bag with her.'],
    },
    aboutOthers: {
      'guest-benno': ['"Benno. Put it down." Benno does not put it down.'],
    },
  },

  'guest-moss': {
    tagline: 'Came with someone who already left.',
    dossier: [
      'Moss did not want to come. Moss says this is fine, repeatedly.',
      'He has spent roughly nine of the last fifty hours in the bathroom.',
      'He came with Priya. Priya has forgotten this.',
      'He has been holding the same warm drink since the first evening.',
    ],
    lines: {
      idle: [
        'Moss is standing near a wall, being near a wall.',
        '"No, this is — yeah. This is fine."',
        'Moss has found the quietest square metre in the house and claimed it.',
      ],
      lured: ['Moss goes, but he does not look pleased about going.'],
      flee: [
        'Moss covers his ears and reverses out of the room.',
        '"That\'s — that is quite loud, actually."',
        'Moss retreats like the noise is water rising.',
      ],
      raid: ['Moss eats a single crisp, apologetically.'],
      dancing: ['Moss is technically dancing. Nobody would swear to it.'],
      nudged: ['"Sorry — sorry, was I — sorry."'],
      shoved: ['Moss apologises to the person who pushed him.'],
      mutate: ['Moss has stopped apologising. That is somehow worse.'],
      leaving: ['Moss is outside. He looks at the sky like he has missed it.'],
      gone: ['Moss walks off very fast without saying goodbye to anybody.'],
    },
    aboutOthers: {
      'guest-priya': ['Moss looks at Priya like he is waiting to be remembered.'],
    },
  },

  'guest-priya': {
    tagline: 'Started all of this. Has not slept since.',
    dossier: [
      'This was Priya\'s idea. She refers to it as "the thing" and will not elaborate.',
      'She has been awake for the entire party. All fifty-two hours of it.',
      'She keeps texting more people to come. Some of them are on their way.',
      'She brought Moss and has not thought about him since the first night.',
    ],
    lines: {
      idle: [
        'Priya is telling someone a story with no beginning.',
        '"Wait — wait, no, listen. LISTEN."',
        'Priya has been awake so long she has come out the other side.',
      ],
      lured: [
        'Priya goes toward it immediately, like a moth with somewhere to be.',
        '"Ooh. Ooh! Yes."',
        'Priya changes direction mid-sentence and does not finish the sentence.',
      ],
      raid: ['"Is there more? There\'s always more. Is there more?"'],
      dancing: [
        'Priya is dancing with her whole entire soul.',
        '"BEST NIGHT. BEST NIGHT OF MY LIFE." It is a Tuesday afternoon.',
        'Priya dances like the party is a thing she has to keep alive by hand.',
      ],
      nudged: ['"Where are we going? Are we going somewhere?"'],
      shoved: ['"Whoa! Okay! Rude! Love that though."'],
      mutate: ['Priya has not blinked in some time.'],
      leaving: ['"Wait, is it over? Is it over?" It has been over for a day.'],
      gone: ['Priya leaves promising to do this again. She means it.'],
    },
  },

  'guest-benno': {
    tagline: 'Brought the keg. Ate everything else.',
    dossier: [
      'Benno brought the keg on the first night and considers this his contribution.',
      'He has eaten every single thing in this house that was not nailed down.',
      'He keeps offering to help clean up. He is not joking. Nobody takes him up on it.',
      'He has been quietly making sure nobody drives home. Nobody has noticed him doing it.',
    ],
    lines: {
      idle: [
        'Benno is looking in a cupboard he has already looked in.',
        '"Anyone need anything? I\'m up."',
        'Benno hums something enormous and tuneless.',
      ],
      lured: ['Benno ambles toward it, delighted.', '"Ohhh, now we\'re talking."'],
      raid: [
        '"There was a lasagne. I know there was a lasagne."',
        'Benno opens the fridge, looks in, closes it. Opens it again.',
        '"I\'m not even hungry. I just like knowing what\'s in there."',
      ],
      dancing: [
        'Benno dances enormously and takes out a lamp.',
        'Benno is dancing with a chair. The chair is losing.',
      ],
      nudged: ['"Oh — sorry, am I in it? I\'m in it."'],
      shoved: ['Benno moves like weather. Slowly, and taking things with him.'],
      mutate: ['Benno is still smiling. There is more of it now.'],
      leaving: ['"Do you want a hand with the — no? Alright. Alright."'],
      gone: ['Benno leaves, and takes three bin bags out on his way. Nobody asked.'],
    },
    aboutOthers: {
      'guest-priya': ['Benno and Priya high-five for no reason at all.'],
    },
  },

  'guest-roz': {
    tagline: 'Has said goodbye four times. Is still here.',
    dossier: [
      'Roz has put her coat on twice and taken it off twice.',
      'She has a train at six. She has had a train at six since Saturday.',
      'She keeps ending up back in the kitchen doorway, mid-sentence, coat in hand.',
      'She does not actually want to go. She wants somebody to ask her to stay.',
    ],
    lines: {
      idle: [
        'Roz says she should probably head off. She does not move.',
        '"Right. Right, okay. Two more minutes."',
        'Roz is holding her coat like a hostage.',
      ],
      lured: ['"Ooh — well, I can\'t leave in the middle of THAT."', 'Roz puts the coat down again.'],
      flee: ['Roz takes the excuse and heads somewhere quieter with it.'],
      raid: ['"I\'ll just grab something for the train. For the train I am getting."'],
      dancing: ['Roz dances in her coat. It is going badly and she does not care.'],
      nudged: ['"I KNOW. I\'m going. I am literally going."'],
      shoved: ['Roz looks genuinely hurt for a second, then laughs it off.'],
      mutate: ['Roz has stopped mentioning the train.'],
      leaving: ['"Okay. Okay, this time I mean it. Love you. Bye. Love you."'],
      gone: ['Roz leaves. She will text about it for a week.'],
    },
    aboutOthers: {
      'guest-denise': ['"Denise, tell me to go home. Please just tell me to go home."'],
    },
  },

  'guest-teddy': {
    tagline: 'Has not left the kitchen since Friday.',
    dossier: [
      'Teddy found the kitchen on the first night and never really came back out.',
      'He has reorganised your cupboards. They are, admittedly, better now.',
      'He is cooking for people who did not ask and are not hungry.',
      'The kitchen is the only room where he does not have to talk to anybody.',
    ],
    lines: {
      idle: [
        'Teddy is doing something complicated with a pan.',
        '"There\'s food if anyone wants food. There\'s food."',
        'Teddy wipes down a counter that is already clean.',
      ],
      lured: ['Teddy drifts toward it, still holding a spoon.'],
      raid: [
        '"Right — who ate the good cheese."',
        'Teddy is not hungry. Teddy is simply in the kitchen, as is correct.',
        '"I can make something. It\'s no trouble. It\'s genuinely no trouble."',
      ],
      dancing: ['Teddy dances the way people dance while holding a hot tray.'],
      nudged: ['"Yep — sorry — hot, hot, coming through."'],
      shoved: ['Teddy sets the pan down very carefully first. That is somehow worse.'],
      mutate: ['Teddy is still cooking. It is no longer clear what.'],
      leaving: ['"There\'s a lasagne in the fridge. Eat the lasagne."'],
      gone: ['Teddy leaves. The kitchen is cleaner than he found it.'],
    },
    aboutOthers: {
      'guest-benno': ['Teddy and Benno have been guarding the same fridge for two days.'],
    },
  },

  'guest-nadia': {
    tagline: 'It is her speaker. She will mention this.',
    dossier: [
      'Nadia brought the speaker and has not relinquished it for fifty-two hours.',
      'She has a rule about requests. The rule is no.',
      'She has been awake so long the set has stopped having a genre.',
      'If you turn the music off, she takes it personally. Genuinely personally.',
    ],
    lines: {
      idle: [
        'Nadia is queueing something nobody asked for.',
        '"No requests. I\'m not doing requests."',
        'Nadia nods along to a track that is not currently playing.',
      ],
      lured: ['Nadia moves toward the sound like it owes her money.', '"That\'s mine. That\'s my sound."'],
      flee: ['Nadia leaves the room the second somebody else touches the volume.'],
      dancing: ['Nadia dances with her eyes shut and her hand on the volume.'],
      nudged: ['"Careful — careful — that\'s equipment."'],
      shoved: ['"Do NOT put your hands on me near the desk."'],
      mutate: ['Nadia has started beatmatching things that are not music.'],
      leaving: ['"I\'m taking the speaker. Obviously I\'m taking the speaker."'],
      gone: ['Nadia leaves, carrying the speaker like a wounded animal.'],
    },
    aboutOthers: {
      'guest-gary': ['Nadia has been calling Gary "canoe guy" for a day and a half.'],
    },
  },

  'guest-colm': {
    tagline: 'Asleep. Has been asleep for some time.',
    dossier: [
      'Colm went for a lie down on Friday evening and has not formally returned.',
      'He surfaces every few hours, says something lucid, and goes back under.',
      'Somebody keeps putting a blanket on him. Nobody will admit to it.',
      'He is the only person here who is going to feel fine tomorrow.',
    ],
    lines: {
      idle: [
        'Colm is asleep somewhere he should not be asleep.',
        'Colm surfaces, says "yeah, no, exactly", and goes back under.',
        'Colm is asleep sitting up, which is a skill.',
      ],
      flee: ['Colm relocates, without ever fully waking up, to somewhere quieter.'],
      lured: ['Colm drifts toward it in the manner of a man sleepwalking.'],
      dancing: ['Colm is asleep. His foot is dancing. Only his foot.'],
      nudged: ['"Mm? Yeah. Yeah, I\'m up."', 'Colm is not up.'],
      shoved: ['Colm wakes properly for the first time in a day. It is not a good look.'],
      mutate: ['Colm is asleep, and it has stopped looking restful.'],
      leaving: ['Colm stands, stretches, and walks out as though this were always the plan.'],
      gone: ['Colm goes home to sleep, which is a joke he would appreciate.'],
    },
    aboutOthers: {
      'guest-nadia': ['Colm sleeps through Nadia\'s entire set. Nadia has noticed.'],
    },
  },

  'guest-yusuf': {
    tagline: 'Everybody assumes he came with somebody else.',
    dossier: [
      'Nobody at this party can say who invited Yusuf. Yusuf is not offering.',
      'He has been introduced to Gary three separate times.',
      'He knows where everything in your house is kept. Nobody has asked how.',
      'He came with Moss. Moss left on Saturday. Yusuf did not want to make a fuss.',
    ],
    lines: {
      idle: [
        'Yusuf is being extremely pleasant to somebody who does not know his name.',
        '"No, no, after you."',
        'Yusuf is standing at the exact edge of a conversation.',
      ],
      lured: ['Yusuf goes, but apologetically.'],
      flee: ['Yusuf removes himself from the room before anyone can ask him to.'],
      raid: ['"Sorry — is it alright if I — sorry."'],
      dancing: ['Yusuf dances at about forty per cent, in case it is not that kind of party.'],
      nudged: ['"Oh — sorry. Sorry. My fault."', '"No, you\'re right, sorry."'],
      shoved: ['Yusuf apologises to the person who just shoved him.'],
      mutate: ['Yusuf has stopped apologising. That is the worrying part.'],
      leaving: ['"Thanks so much for having me. Really. Thank you."'],
      gone: ['Yusuf lets himself out and shuts the door quietly behind him.'],
    },
    aboutOthers: {
      'guest-moss': ['Yusuf keeps looking at the door Moss went out of.'],
    },
  },

  'guest-bex': {
    tagline: 'Filming all of it. For what, nobody knows.',
    dossier: [
      'Bex has been recording since hour nine. She has not posted any of it.',
      'She narrates things that are already happening, quietly, to the camera.',
      'She has forty minutes of footage of Colm asleep. She calls it a study.',
      'She is filming because if she puts the phone down she has to be in the party.',
    ],
    lines: {
      idle: [
        'Bex films the ceiling for a while, then films the floor.',
        '"Say something. No — say it again, but worse."',
        'Bex is narrating the room to the room.',
      ],
      lured: ['Bex follows it, filming, walking backwards.', '"Oh this is CONTENT."'],
      dancing: ['Bex dances one-handed. The other hand is filming her dancing.'],
      nudged: ['"You\'re in shot. You\'re — okay, fine, you\'re in shot."'],
      shoved: ['Bex keeps filming through the whole thing. That will be worse later.'],
      mutate: ['Bex has stopped narrating. She is still filming.'],
      leaving: ['"Wait — one more. One more and then I\'m gone."'],
      gone: ['Bex leaves with four hours of footage nobody will ever see.'],
    },
    aboutOthers: {
      'guest-colm': ['Bex films Colm sleeping again. It is the fourth time.'],
    },
  },

  'guest-marlon': {
    tagline: 'Two days in and still going back for seconds.',
    dossier: [
      'Marlon has treated this party as a buffet with a social component.',
      'He and Teddy have an unspoken arrangement about the kitchen. Neither will explain it.',
      'He has strong opinions about the correct order of a plate.',
      'He is here because his flat is empty and this one is not.',
    ],
    lines: {
      idle: [
        'Marlon is assembling a plate with real architectural ambition.',
        '"Nah, you have to go savoury first. Everyone knows that."',
        'Marlon considers the fridge from a middle distance.',
      ],
      lured: ['Marlon relocates, plate first.'],
      raid: [
        '"There\'s got to be something left. There\'s always something left."',
        'Marlon eats something he cannot identify and does not ask.',
        '"Right. Second dinner."',
      ],
      dancing: ['Marlon dances without putting the plate down. Respect.'],
      nudged: ['"Mind the plate. Mind the PLATE."'],
      shoved: ['Marlon loses half the plate and takes it extremely personally.'],
      mutate: ['Marlon is eating faster now, and looking at people while he does it.'],
      leaving: ['"I\'ll take this with me, yeah? Cheers."'],
      gone: ['Marlon leaves with a plate. It is your plate.'],
    },
    aboutOthers: {
      'guest-teddy': ['Marlon and Teddy nod at each other across the kitchen. Nothing is said.'],
    },
  },
};


/**
 * THE HOUSE ITSELF
 *
 * Fires occasionally between the guest lines so a quiet turn is never silent.
 * Some are gated on state, because an ambient line that contradicts the board
 * ("the music thumps") when the speaker is off breaks the spell instantly.
 */
export interface AmbientEvent {
  text: string;
  /** Only eligible when this holds. Omitted means always eligible. */
  when?: (context: AmbientContext) => boolean;
}

export interface AmbientContext {
  musicOn: boolean;
  suspicion: number;
  turn: number;
  guestsLeft: number;
}

export const AMBIENT: readonly AmbientEvent[] = [
  { text: 'Somewhere upstairs a smoke alarm chirps once, and gives up.' },
  { text: 'The fridge hums. It is the most reasonable thing in the house.' },
  { text: 'A red cup falls off something. Nobody looks.' },
  { text: 'Something in the walls settles, or moves. Hard to say.' },
  { text: 'The house smells like a carpet that has seen things.' },
  { text: 'A phone buzzes face-down on a table. It has been buzzing for a day.' },
  { text: 'One of the balloons finally gives up and sinks to the floor.' },
  { text: 'There is a plate of something in the hallway. It has a fork in it. It is not yours.' },
  { text: 'Somebody has written on the mirror. You cannot read it.' },
  {
    text: 'The bass rattles a picture frame a few degrees off true.',
    when: (c) => c.musicOn,
  },
  {
    text: 'The music skips, and for one second everyone remembers where they are.',
    when: (c) => c.musicOn,
  },
  {
    text: 'A car slows outside, then keeps going. This time.',
    when: (c) => c.suspicion >= 40,
  },
  {
    text: 'A light goes on in the house across the road.',
    when: (c) => c.suspicion >= 55,
  },
  {
    text: 'Someone next door closes a window very deliberately.',
    when: (c) => c.suspicion >= 70,
  },
  {
    text: 'The house is quieter than it was. You do not entirely trust it.',
    when: (c) => c.guestsLeft <= 2,
  },
  {
    text: 'You catch your reflection. You have been at this party for fifty-two hours too.',
    when: (c) => c.turn > 8,
  },
];

/** Deterministic index, so the same turn always tells the same story. */
export function pickIndex(seed: string, turn: number, length: number): number {
  if (length <= 0) return 0;
  let h = turn * 2246822519;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 3266489917);
  return ((h ^ (h >>> 15)) >>> 0) % length;
}

/** How many hours near someone before the next line of their dossier opens. */
export const FAMILIARITY_STEPS: readonly number[] = [4, 10, 18, 28];
