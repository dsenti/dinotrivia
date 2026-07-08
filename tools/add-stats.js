#!/usr/bin/env node
/* Merge supplemental stats (height, skull length, neck vertebrae) into
   data/dinosaurs.json. Values are approximate published/derived estimates
   chosen for trustworthy relative ordering; a dinosaur left out of a map keeps
   null for that stat and simply never appears in that category. No invented
   precision — only genera I'm confident about are filled.
   Run once:  node tools/add-stats.js         */
const fs = require("fs");
const path = require("path");
const P = path.resolve(__dirname, "..", "data", "dinosaurs.json");
const json = JSON.parse(fs.readFileSync(P, "utf8"));

// hip / standing height (m)
const HEIGHT = {
  Tyrannosaurus: 3.3, Triceratops: 2.6, Velociraptor: 0.5, Stegosaurus: 2.4, Brachiosaurus: 5,
  Spinosaurus: 2.7, Allosaurus: 2.2, Diplodocus: 3.2, Ankylosaurus: 1.7, Parasaurolophus: 2.5,
  Iguanodon: 2.7, Compsognathus: 0.26, Gallimimus: 1.9, Deinonychus: 0.87, Archaeopteryx: 0.3,
  Oviraptor: 0.9, Maiasaura: 2.3, Therizinosaurus: 3.5, Carnotaurus: 2, Giganotosaurus: 3.6,
  Utahraptor: 1.5, Microraptor: 0.2, Apatosaurus: 3.6, Pachycephalosaurus: 1.6, Dilophosaurus: 1.5,
  Coelophysis: 0.6, Plateosaurus: 1.5, Herrerasaurus: 1.1, Eoraptor: 0.3, Baryonyx: 2.2,
  Troodon: 0.9, Ornithomimus: 1.4, Protoceratops: 0.6, Edmontosaurus: 2.7, Ceratosaurus: 1.6,
  Megalosaurus: 2, Mamenchisaurus: 4, Argentinosaurus: 6, Nigersaurus: 1.8, Suchomimus: 2.6,
  Sinosauropteryx: 0.2, Gorgosaurus: 2.3, Albertosaurus: 2.3, Tarbosaurus: 3, Psittacosaurus: 0.6,
  Pentaceratops: 2.5, Camarasaurus: 3.3, Corythosaurus: 2.4, Styracosaurus: 1.8, Kentrosaurus: 1.2,
  Yutyrannus: 2, Brontosaurus: 3.5, Ouranosaurus: 2.2, Sauropelta: 1.4, Concavenator: 1.6,
  Struthiomimus: 1.4, Torosaurus: 2.7, Sauroposeidon: 6
};

// skull length (m), including frill/crest where that is the "head" length
const SKULL = {
  Tyrannosaurus: 1.5, Triceratops: 2, Velociraptor: 0.23, Stegosaurus: 0.4, Brachiosaurus: 0.8,
  Spinosaurus: 1.75, Allosaurus: 0.85, Diplodocus: 0.6, Ankylosaurus: 0.64, Parasaurolophus: 1.5,
  Iguanodon: 0.9, Gallimimus: 0.33, Deinonychus: 0.41, Carnotaurus: 0.6, Giganotosaurus: 1.7,
  Apatosaurus: 0.55, Pachycephalosaurus: 0.6, Dilophosaurus: 0.5, Baryonyx: 0.95, Ornithomimus: 0.25,
  Protoceratops: 0.5, Edmontosaurus: 1, Ceratosaurus: 0.6, Suchomimus: 1.1, Gorgosaurus: 1,
  Albertosaurus: 1, Tarbosaurus: 1.3, Pentaceratops: 2.7, Camarasaurus: 0.55, Corythosaurus: 0.8,
  Styracosaurus: 1, Brontosaurus: 0.5, Torosaurus: 2.6, Maiasaura: 0.8
};

// cervical (neck) vertebrae count
const NECK = {
  Diplodocus: 15, Apatosaurus: 15, Brontosaurus: 15, Brachiosaurus: 13, Camarasaurus: 12,
  Mamenchisaurus: 19, Nigersaurus: 13, Tyrannosaurus: 10, Allosaurus: 10, Velociraptor: 10,
  Deinonychus: 10, Coelophysis: 10, Gallimimus: 10, Ornithomimus: 10, Struthiomimus: 10,
  Edmontosaurus: 15, Parasaurolophus: 15, Corythosaurus: 15, Maiasaura: 15, Tarbosaurus: 10
};

let counts = { height: 0, skull: 0, neck: 0 };
for (const d of json.dinosaurs) {
  d.height = HEIGHT[d.name] ?? null;
  d.skull = SKULL[d.name] ?? null;
  d.neck = NECK[d.name] ?? null;
  if (d.height != null) counts.height++;
  if (d.skull != null) counts.skull++;
  if (d.neck != null) counts.neck++;
}
fs.writeFileSync(P, JSON.stringify(json, null, 2) + "\n");
console.log("merged:", counts);
