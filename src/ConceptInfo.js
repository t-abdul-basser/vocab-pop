import * as AppState from './AppState';
import _ from 'supergroup'; // in global space anyway...
import Rx from 'rxjs/Rx';

export default class ConceptInfo {
  //based on data from http://localhost:3000/api/cdms/conceptInfo?cdmSchema=cdm2&concept_id=201820&resultsSchema=results2
  constructor({lookupField, params, rec, cb, conceptRole} = {}) { // expect lookupField and params, or rec
    this._valid = false;
    this._status = 'loading';
    this.bsubj = new Rx.BehaviorSubject(this); // caller will subscribe
    this.gotResults = this.gotResults.bind(this);
    this.sendUpdate = this.sendUpdate.bind(this);
    if (cb) this.cb = cb;
    if (rec) {
      this._crec = rec;
      this.lookupField = 'concept_id';
      this.lookupVal = rec.concept_id;
      this.params = {concept_id:rec.concept_id}; // apiParams
    } else {
      this.lookupField = lookupField;
      this.params = params;
      if (!_.has(params, lookupField)) throw new Error(`expected params[${lookupField}]`);
      this.lookupVal = params[lookupField];
    }
    this[this.lookupField] = this.lookupVal;
    if (conceptRole) {
      this._conceptRole = conceptRole;
    }
    this.stream = this.lookup();
    this.stream.subscribe(results=>{
      this.gotResults(results);
    });
  }
  // status methods -- combine?
  loading() {
    return this._status === 'loading';
  }
  loaded() {
    return this._status !== 'loading' && this._status !== 'failed';
  }
  failed() {
    return this._status === 'failed';
  }
  valid() {
    return this._valid;
  }
  multiple() {
    return this._status === 'multiple';
  }
  conceptRole() {
    return this._conceptRole;
  }
  multipleReady() {
    return !!(this._status === 'multiple' && this._multipleAsCis);
  }
  selfInfo(context) { // not using context
    if (this.loading()) {
      return [
        {title:'Status', className:'ci-status', value: 'Loading'},
        this.selfInfoBit(this.lookupField),
      ];
    }
    if (this.failed()) {
      let lookupInfo = this.selfInfoBit(this.lookupField);
      return [
        {title:'Status', className:'ci-status', 
          value: `No concepts matching 
                    ${lookupInfo.title} ${lookupInfo.value}`},
      ];
    }
    if (this.multiple()) {
      let codeInfo = this.selfInfoBit('concept_code');
      return [
        {title:'Status', className:'name', 
          wholeRow: `${this.getMultiple().length} concepts matching 
                    ${codeInfo.title} ${codeInfo.value}`},
      ];
    }
    if (this.valid()) {
      return [
        {title: this.scTitle(), className: 'name', 
            wholeRow: `${this.scTitle()} ${this.get('concept_name')}`,
            linkParams:{concept_id: this.get('concept_id')}},
        {title: this.get('vocabulary_id') + ' code', className: 'code', value: this.get('concept_code') },
        this.selfInfoBit('domain_id'),
        this.selfInfoBit('concept_class_id'),
      ];
    }
    if (this.conceptRole()) {
      switch (this.conceptRole()) {
        case 'mapsto':
        case 'mappedfrom':
        case 'relatedConcept':
          return [      // same as this.valid() at the moment...should combine stuff
            {title: this.scTitle(), className: 'name', 
                wholeRow: `${this.scTitle()} ${this.get('concept_name')}`,
                linkParams:{concept_id: this.get('concept_id')}},
            {title: this.get('vocabulary_id') + ' code', className: 'code', value: this.get('concept_code') },
            this.selfInfoBit('domain_id'),
            this.selfInfoBit('concept_class_id'),
          ];
      }
    }
    throw new Error("what am I?");
  }
  selfInfoBit(bit, context) {
    return {title: this.fieldTitle(bit), className: this.fieldClass(bit), value: this.get(bit)};
  }
  infoBit(bit, context) {
  }
  get(field, fail=false) {
    if (_.has(this._crec, field)) return this._crec[field];
    if (typeof this[field] === 'function') return this[field]();
    if (this._ci && this._ci[field]) return this._ci[field];
    if (field === this.lookupField) return this.lookupVal;
    if (fail) throw new Error(`can't find ${field}`);
  }
  scClassName() {
    let scVal = this.scMap('className');
    return scVal ? `sc-${scVal}` : 'invalid-concept';
  }
  scTitle() {
    let scVal = this.scMap('title');
    return scVal || `Can't find standard_concept`;
  }
  scMap(out, sc) { // out = title or className
    sc = sc || this.get('standard_concept', false);
    let r = ({
              S: {title:'Standard Concept', className: 'standard-concept'},
              C: {title:'Classification Concept', className: 'classification-concept'},
              X: {title:'Non-Standard Concept', className: 'non-standard-concept'},
        })[sc];
    return r && r[out];
  }
  fieldTitle(field, val) { // maybe just a general lookup for nice names
    //if (val) { }
    return ({
              concept_id: 'Concept ID',
              concept_code: 'Concept Code',
              concept_name: 'Name',
              domain_id: 'Domain',
              concept_class_id: 'Class',
              vocabulary_id: 'Vocabulary',
              mapsto: 'Maps to',
              mappedfrom: 'Mapped from',
        })[field] || `no title for ${field}`;
  }
  fieldClass(field) {
    return ({
              concept_id: 'concept-id',
              concept_name: 'concept-name',
              concept_code: 'concept-code',
              domain_id: 'domain-id',
              concept_class_id: 'concept-class-id',
              vocabulary_id: 'vocabulary-id',
        })[field] || `no-class-for-${field}`;
  }
  relatedConcepts() {
    return this.valid() && this._ci.relatedConcepts || [];
  }
  mapsto() {
    return (this.relatedConcepts()
                .filter(rec=>rec.relationship_id === 'Maps to')
                .map(rec=>new ConceptInfo({rec, conceptRole:'mapsto',
                                    cb:this.sendUpdate})));
  }
  mappedfrom() {
    return (this.relatedConcepts()
                .filter(rec=>rec.relationship_id === 'Mapped from')
                .map(rec=>new ConceptInfo({rec, conceptRole:'mappedfrom',
                                    cb:this.sendUpdate})));
  }
  otherRels() {
    let mt = [];
    return this.relatedConcepts().filter(d=>!d.relationship_id.match(/^Map/));
  }
  want({lookupField, params, } = {}) {
    if (this.lookupField === lookupField && this.lookupVal === params[lookupField]) {
      return this;
    }
    this.done();
    return new ConceptInfo({lookupField, params});
  }
  subscribe(cb) {
    this.bsubj.subscribe(cb); // get rid of old ones!
  }
  done() {
    this.stream.unsubscribe();
    this.bsubj.unsubscribe();
  }
  gotResults(results) {
    if (!results) {
      this._status = 'failed';
    } else if (Array.isArray(results)) {
      if (!results.length) {
        this._status = 'failed';
      } else {
        if (this.lookupField !== 'concept_code')
          throw new Error("shouldn't be having array results unless looking up by concept_code");
        if (results[0].concept_code !== this.lookupVal) throw new Error("impossible");
        this._status = 'multiple';
        this._multipleRecs = results;
        this._crec = {concept_code: this.lookupVal};
      }
    } else {
      if (results.conceptRecord) {
        //Object.assign(this, results.conceptRecord); // stop doing this
        this._crec = results.conceptRecord; // this instead...?
        this._ci = results;
        this._valid = true;
        this._status = 'success';
      }
    }
    this.sendUpdate();
  }
  sendUpdate(source) {
    //if (this.parentCi) this.parentCi.sendUpdate();
    if (this.cb) 
      this.cb('fromChild');
    //else
    this.bsubj.next(this);
  }
  lookup() {
    //const {lookupField, val} = params;
    return new AppState.ApiStream({ apiCall: 'conceptInfo', params:this.params});
  }
  getMultiple() {
    if (this._status === 'multiple') return this._multipleRecs;
  }
  getMultipleAsCi() {
    if (this._status === 'multiple') return this._multipleAsCis;
  }
  resolveMultiple(max) {
    if (this._multipleAsCis && this._multipleAsCis.length === Math.min(max, this._multipleRecs.length))
      return;
    this._multipleAsCis = this._multipleRecs.slice(0,max)
          .map(rec=>new ConceptInfo({rec, cb:this.sendUpdate}))
  }
  cdmCounts() {
    return this.valid() && this._crec.rcs.filter(d=>d.rc) || [];
  }
  cdmSrcCounts() {
    return this.valid() && this._crec.rcs.filter(d=>d.src) || [];
  }
  rc() {
    return this.valid() && _.sum(this._crec.rcs.map(d=>d.rc));
  }
  tblcol(crec) { // old...not sure if working
    if (crec)
      return crec.tbl+':'+crec.col;
  }
}

