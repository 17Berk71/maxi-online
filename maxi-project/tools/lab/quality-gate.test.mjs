import test from'node:test';import assert from'node:assert/strict';import{geometryAcceptance}from'./quality-gate.mjs';
const clear=()=>({intersections:{intersectingTriangles:0},seams:{maxGap:0},boundary:{nonmanifold:0,collapsed:0,loops:Array.from({length:4},()=>({irregularVertices:0}))},expectedLoops:4,qc:{score:100}});
test('a high old QC score cannot approve a body crossing',()=>{const g=clear();g.intersections.intersectingTriangles=1;assert.equal(geometryAcceptance([g]).accepted,false);});
test('natural neck, hem and cuff openings pass; an extra hole is rejected',()=>{const g=clear();assert.equal(geometryAcceptance([g]).accepted,true);g.boundary.loops.push({irregularVertices:0});assert.equal(geometryAcceptance([g]).accepted,false);});
test('a seam gap or pinched boundary blocks acceptance even with zero body crossings',()=>{const g=clear();g.seams.maxGap=.0006;assert.equal(geometryAcceptance([g]).accepted,false);g.seams.maxGap=0;g.boundary.loops[0].irregularVertices=2;assert.equal(geometryAcceptance([g]).accepted,false);});

test('an empty render cannot pass garment acceptance',()=>{assert.equal(geometryAcceptance([]).accepted,false);});
