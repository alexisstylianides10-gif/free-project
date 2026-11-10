import type { AttributeKey, Attributes, ISODate, Personality, Player, Position, Staff, StaffRole } from "../core/types";
import { ATTRIBUTE_KEYS, ATTRIBUTE_GROUPS } from "../core/types";
import { Rng } from "../core/rng";
import { POSITION_WEIGHTS, ratingAt } from "../core/ratings";
import { addDays } from "../core/dates";
import { clamp } from "../core/util";

/**
 * Procedural generation of FICTIONAL people (youth intakes, regens, staff and
 * the clearly-labelled development dataset). Name pools are generic and
 * combinations are random; generated people never represent real individuals.
 */
export const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  anglic: {
    first: ["Oliver", "Harry", "Jack", "Charlie", "Thomas", "George", "Oscar", "James", "William", "Noah", "Alfie", "Joshua", "Leo", "Ethan", "Mason", "Logan", "Lucas", "Callum", "Ryan", "Connor", "Kieran", "Lewis", "Owen", "Rhys", "Dylan", "Toby", "Elliot", "Reece", "Jamie", "Aaron", "Ben", "Sam", "Max", "Archie", "Finley", "Kai", "Tyler", "Nathan", "Liam", "Adam"],
    last: ["Ashford", "Bramley", "Calloway", "Denholm", "Ellery", "Fairbrook", "Garside", "Hartwell", "Ingleby", "Jarrow", "Kettering", "Langdon", "Marlow", "Northcott", "Oakden", "Pemberton", "Quarrie", "Radcliffe", "Selby", "Thornbury", "Underhill", "Vance", "Whitlock", "Yardley", "Abbot", "Blakemore", "Crossley", "Dunmore", "Elstow", "Fenwick", "Greaves", "Holbrook", "Ivers", "Kingsley", "Lockwood", "Middleton", "Newbold", "Ormsby", "Pickering", "Rowntree", "Stanmore", "Tolland", "Wardle", "Haskins", "Brightwell", "Coldwell", "Ainsworth", "Bexley"],
  },
  iberic: {
    first: ["Alejandro", "Pablo", "Daniel", "Adrián", "Javier", "Diego", "Álvaro", "Mario", "Sergio", "Hugo", "Iker", "Raúl", "Marcos", "Rubén", "Unai", "Gonzalo", "Jorge", "Víctor", "Íñigo", "Aitor", "Borja", "Carlos", "Nacho", "Óscar", "Rodrigo", "Andrés", "Miguel", "Tomás", "Samuel", "Joel"],
    last: ["Alcaraz", "Benavente", "Cifuentes", "Domínguez", "Escobedo", "Fajardo", "Garrido", "Herrán", "Ibarra", "Jiménez", "Lozano", "Montalbán", "Navarrete", "Olmedo", "Peñalver", "Quintana", "Robledo", "Salcedo", "Tamayo", "Urquiza", "Valdivia", "Zamora", "Arriaga", "Barrenechea", "Carrasco", "Echeverría", "Galindo", "Llorente", "Mendizábal", "Orozco", "Prieto", "Sarabia", "Toledano", "Villalba"],
  },
  italic: {
    first: ["Lorenzo", "Matteo", "Alessandro", "Leonardo", "Francesco", "Andrea", "Riccardo", "Gabriele", "Tommaso", "Davide", "Federico", "Simone", "Marco", "Nicolò", "Pietro", "Edoardo", "Giacomo", "Samuele", "Filippo", "Luca", "Emanuele", "Stefano", "Christian", "Daniele", "Michele", "Antonio", "Giorgio", "Mattia"],
    last: ["Albertini", "Bellucci", "Cavallaro", "D'Ambrosio", "Esposti", "Ferrandi", "Galletti", "Iacobelli", "Lombardo", "Marchetti", "Nardone", "Orsolini", "Pellegrini", "Quaranta", "Rinaldi", "Santoro", "Tedeschi", "Ugolini", "Valentini", "Zanetti", "Bertolucci", "Cardone", "Donadoni", "Fabbri", "Guidetti", "Lucarelli", "Mancuso", "Palumbo", "Ruggiero", "Sabatini", "Trombetta", "Vitale"],
  },
  germanic: {
    first: ["Lukas", "Leon", "Finn", "Jonas", "Elias", "Niklas", "Felix", "Paul", "Moritz", "Julian", "Tim", "Jan", "Tobias", "Florian", "Maximilian", "Philipp", "Kevin", "Dominik", "Fabian", "Sebastian", "Marvin", "Kai", "Nils", "Lennart", "Malte", "Jannik", "Henrik", "Ole", "Benedikt", "Johannes"],
    last: ["Achterberg", "Brandauer", "Dietrich", "Eckhardt", "Falkenrath", "Gerlach", "Hollstein", "Jäger", "Kästner", "Lindemann", "Mertens", "Neuhaus", "Oberdorf", "Pfeiffer", "Reinholt", "Schaller", "Tessmer", "Ulbrich", "Vogler", "Wendland", "Zimmerling", "Bauerfeind", "Drechsler", "Fröhlich", "Grünewald", "Hartung", "Kranz", "Lorenzen", "Mühlbauer", "Rösler", "Steinmetz", "Wolters"],
  },
  nordic: {
    first: ["Erik", "Lars", "Magnus", "Anders", "Henrik", "Jonas", "Mikkel", "Sander", "Oskar", "Emil", "Viktor", "Mathias", "Rasmus", "Kasper", "Tobias", "Sindre", "Eirik", "Aksel", "Jesper", "Fredrik", "Johan", "Isak", "Hugo", "Linus", "Elias"],
    last: ["Aaberg", "Bjørnstad", "Dahlgren", "Ekström", "Fjeld", "Grønlund", "Halvorsen", "Isaksen", "Jakobsen", "Kvist", "Lindqvist", "Moberg", "Nygård", "Ødegård", "Persson", "Rønning", "Sandvik", "Thorsen", "Ulvestad", "Vik", "Westergaard", "Åkesson", "Berglund", "Engström", "Holm", "Lund", "Strand", "Wiik"],
  },
  franco: {
    first: ["Lucas", "Hugo", "Théo", "Nathan", "Louis", "Enzo", "Mathis", "Raphaël", "Gabriel", "Arthur", "Jules", "Maxime", "Antoine", "Clément", "Baptiste", "Romain", "Quentin", "Alexis", "Valentin", "Kylian", "Yanis", "Bastien", "Florian", "Rayan", "Noé", "Mathéo"],
    last: ["Aubertin", "Beaulieu", "Chevalier", "Delacroix", "Esnault", "Fontaine", "Girardot", "Hébert", "Jourdan", "Lacombe", "Marchand", "Noiret", "Olivier", "Perrault", "Rousselet", "Sauvage", "Thibault", "Vasseur", "Bertrand", "Courtois", "Dufresne", "Faucher", "Guérin", "Lemaire", "Moreau", "Pichon", "Renaud", "Tessier"],
  },
  lusitan: {
    first: ["João", "Rodrigo", "Tiago", "Diogo", "Gonçalo", "Rafael", "Martim", "Duarte", "Tomás", "Afonso", "Bruno", "Pedro", "Ricardo", "Nuno", "Rúben", "Vitinha", "Gabriel", "Henrique", "Lucas", "Matheus", "Thiago", "Caio", "Vinícius", "Felipe"],
    last: ["Albuquerque", "Barros", "Cardoso", "Damasceno", "Esteves", "Figueiredo", "Gouveia", "Henriques", "Leitão", "Magalhães", "Nogueira", "Pacheco", "Queirós", "Rebelo", "Sampaio", "Teixeira", "Valente", "Xavier", "Brandão", "Coutinho", "Fonseca", "Medeiros", "Paiva", "Simões"],
  },
  hellenic: {
    first: ["Andreas", "Georgios", "Christos", "Konstantinos", "Nikolas", "Michalis", "Panagiotis", "Marios", "Charalambos", "Kyriakos", "Stelios", "Antonis", "Loizos", "Savvas", "Pieros", "Fotis", "Ioannis", "Demetris", "Kostas", "Petros", "Neophytos", "Evagoras", "Marinos", "Valentinos"],
    last: ["Georgiou", "Charalambous", "Constantinou", "Christodoulou", "Ioannou", "Panayiotou", "Kyriakou", "Antoniou", "Michael", "Nicolaou", "Demetriou", "Savva", "Papadopoulos", "Hadjigeorgiou", "Stylianou", "Theodorou", "Loizou", "Christofi", "Efthymiou", "Sotiriou", "Kyprianou", "Andreou", "Pavlou", "Zacharias"],
  },
  slavic: {
    first: ["Luka", "Marko", "Ivan", "Nikola", "Filip", "Petar", "Stefan", "Mateo", "Josip", "Dario", "Tomáš", "Jakub", "Ondřej", "Kamil", "Mateusz", "Piotr", "Dominik", "Patrik", "Bartosz", "Milan", "Andrej", "Nemanja"],
    last: ["Andrić", "Babić", "Čolak", "Dragović", "Ercegović", "Filipović", "Grgić", "Horvat", "Ilić", "Jurić", "Kovač", "Lovrić", "Marković", "Novak", "Orlić", "Pavlović", "Radić", "Šimić", "Tomić", "Vuković", "Zelenka", "Kowalczyk", "Nowicki", "Dvořák", "Procházka", "Wiśniewski"],
  },
};

export function generateName(rng: Rng, pool: string): { firstName: string; lastName: string } {
  const p = NAME_POOLS[pool] ?? NAME_POOLS.anglic;
  return { firstName: rng.pick(p.first), lastName: rng.pick(p.last) };
}

const GK_KEYS = ATTRIBUTE_GROUPS.goalkeeping;

/** Generate attributes for a position whose overall lands close to `target` (1–100). */
export function generateAttributes(rng: Rng, pos: Position, target: number): Attributes {
  const weights = POSITION_WEIGHTS[pos];
  const base = clamp(target / 5, 1, 20);
  const attrs = {} as Attributes;
  for (const k of ATTRIBUTE_KEYS) {
    const w = weights[k as AttributeKey] ?? 0;
    let v: number;
    if (pos === "GK") {
      if (GK_KEYS.includes(k)) v = base + rng.normal(0, 1.4);
      else if (k === "positioning" || k === "composure" || k === "decisions" || k === "anticipation" || k === "agility") v = base + rng.normal(-0.5, 1.5);
      else if (ATTRIBUTE_GROUPS.technical.includes(k)) v = base * 0.45 + rng.normal(0, 1.5);
      else v = base * 0.75 + rng.normal(0, 2);
    } else if (GK_KEYS.includes(k)) {
      v = rng.int(1, 4);
    } else if (w > 0) {
      v = base + rng.normal(0.3, 1.5);
    } else {
      v = base * 0.78 + rng.normal(0, 2.2);
    }
    attrs[k] = clamp(Math.round(v), 1, 20);
  }
  // nudge towards the requested overall
  for (let iter = 0; iter < 30; iter++) {
    const ovr = ratingAt(attrs, pos);
    if (Math.abs(ovr - target) <= 1) break;
    const dir = ovr < target ? 1 : -1;
    const keys = Object.keys(weights) as AttributeKey[];
    const k = rng.pick(keys);
    attrs[k] = clamp(attrs[k] + dir, 1, 20);
  }
  return attrs;
}

export function generatePersonality(rng: Rng): Personality {
  const r = () => clamp(Math.round(rng.normal(11, 3.5)), 1, 20);
  return { professionalism: r(), ambition: r(), temperament: r(), consistency: r(), injuryProneness: clamp(Math.round(rng.normal(8, 3.5)), 1, 20) };
}

const ALT_POSITIONS: Partial<Record<Position, Position[]>> = {
  LB: ["LWB", "LM", "CB"], RB: ["RWB", "RM", "CB"], CB: ["DM", "LB", "RB"], DM: ["CM", "CB"], CM: ["DM", "AM"], AM: ["CM", "ST", "LW", "RW"],
  LM: ["LW", "LB", "CM"], RM: ["RW", "RB", "CM"], LW: ["LM", "ST", "RW"], RW: ["RM", "ST", "LW"], ST: ["AM", "LW", "RW"], LWB: ["LB", "LM"], RWB: ["RB", "RM"],
};

export interface GeneratePlayerOptions {
  id: string;
  nationId: string;
  namePool: string;
  position: Position;
  overall: number;
  potential: number;
  dob: ISODate;
  clubId: string | null;
  generated: boolean;
}

export function generatePlayer(rng: Rng, o: GeneratePlayerOptions): Player {
  const { firstName, lastName } = generateName(rng, o.namePool);
  const alts = ALT_POSITIONS[o.position] ?? [];
  const altPositions = alts.filter(() => rng.chance(0.35)).slice(0, 2) as Position[];
  return {
    id: o.id,
    firstName,
    lastName,
    dob: o.dob,
    nationId: o.nationId,
    clubId: o.clubId,
    loanParentClubId: null,
    position: o.position,
    altPositions,
    foot: o.position.startsWith("L") ? (rng.chance(0.75) ? "L" : "R") : o.position.startsWith("R") ? (rng.chance(0.8) ? "R" : "L") : rng.chance(0.15) ? "B" : rng.chance(0.75) ? "R" : "L",
    heightCm: o.position === "GK" ? rng.int(184, 198) : o.position === "CB" ? rng.int(180, 196) : rng.int(166, 190),
    attributes: generateAttributes(rng, o.position, o.overall),
    potential: Math.max(o.potential, o.overall),
    personality: generatePersonality(rng),
    contract: null,
    squadStatus: "none",
    askingPrice: null,
    fitness: 100,
    fatigue: 0,
    morale: 70,
    form: 6.6,
    sharpness: 70,
    tacticalFamiliarity: 60,
    injury: null,
    suspensions: [],
    yellowAccumulation: {},
    seasonStats: {},
    trainingFocus: "balanced",
    retrainPosition: null,
    retired: false,
    generated: o.generated,
    source: o.generated ? "generated" : "dataset",
    value: 0,
    happiness: 70,
  };
}

export function randomDob(rng: Rng, today: ISODate, age: number): ISODate {
  return addDays(today, -Math.round(age * 365.25 + rng.int(0, 364)));
}

export function generateStaff(rng: Rng, o: { id: string; nationId: string; namePool: string; role: StaffRole; quality: number; today: ISODate; clubId: string | null }): Staff {
  const { firstName, lastName } = generateName(rng, o.namePool);
  const q = clamp(o.quality, 1, 20);
  const a = (bias = 0) => clamp(Math.round(q + bias + rng.normal(0, 2)), 1, 20);
  const attributes = {
    coaching: a(), attacking: a(o.role === "attacking_coach" ? 2 : -1), defending: a(o.role === "defensive_coach" ? 2 : -1), goalkeeping: a(o.role === "goalkeeping_coach" ? 3 : -4),
    fitness: a(o.role === "fitness_coach" ? 3 : -2), youth: a(o.role === "youth_coach" ? 3 : -1), tactical: a(o.role === "manager" || o.role === "assistant" ? 2 : -1),
    setPieces: a(o.role === "set_piece_coach" ? 3 : -2), judgingAbility: a(o.role === "scout" || o.role === "head_of_recruitment" ? 3 : -1),
    judgingPotential: a(o.role === "scout" || o.role === "head_of_recruitment" ? 3 : -1), medical: a(o.role === "physio" ? 4 : -6), manManagement: a(o.role === "manager" ? 2 : 0),
  };
  const age = rng.int(32, 64);
  const spec: Record<StaffRole, string> = {
    manager: rng.pick(["Possession football", "High pressing", "Counter-attacking", "Defensive organisation", "Youth development"]),
    assistant: "Match preparation", attacking_coach: "Finishing & movement", defensive_coach: "Defensive shape", goalkeeping_coach: "Shot stopping",
    fitness_coach: "Conditioning", youth_coach: "Academy coaching", set_piece_coach: "Set-piece routines", scout: rng.pick(["Domestic market", "Youth talent", "Value signings"]),
    head_of_recruitment: "Recruitment strategy", physio: "Injury rehabilitation",
  };
  return {
    id: o.id, firstName, lastName, dob: addDays(o.today, -age * 365), nationId: o.nationId, clubId: o.clubId, role: o.role, attributes,
    experience: clamp(Math.round((age - 30) / 2 + rng.normal(0, 2)), 1, 20), reputation: clamp(Math.round(q * 4.5 + rng.normal(0, 6)), 1, 100),
    specialisation: spec[o.role], contract: null, preferredFormation: o.role === "manager" ? rng.pick(["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1", "3-4-3"]) : null,
    isUser: false, source: "generated",
  };
}
