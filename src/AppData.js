import _ from 'supergroup';
import * as util from './utils';

export default function({cdmSchema,resultsSchema,apiRoot} = {}) {

  /*
  export function dataToStateWhenReady(component, items) {
    console.error("GET RID OF");
    // this doesn't work very well. switching to event broadcast
    // get rid of

    if (!items) {
      items = _.keys(appData);
    }
    let promises = items.map(
      (item) => {
        return appData[item].then(
                (data) => {
                  component.setState({[item]: data})
                  if (DEBUG) appDataResolved[item] = data;
                }
        );
      });
    let allp = Promise.all(promises);
    window.allp = allp;
    console.log('all p', allp);
    return allp;
  }

  function concepts(params={}, queryName="conceptStats") {
    params = _.clone(params);
    let apiCall = 'concepts';
    params.resultsSchema = resultsSchema;
    params.cdmSchema = cdmSchema;
    params.queryName = queryName;
    return (util.cachedPostJsonFetch(
            `${apiRoot}/${apiCall}Post`, params)
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.queryName, json.error.url);

              json.forEach(rec=>{
                rec.conceptrecs = parseInt(rec.conceptrecs, 10);
                rec.dbrecs = parseInt(rec.dbrecs, 10);
                //rec.count = parseInt(rec.count, 10);
                //rec.table_name = rec.table_name.replace(/^[^\.]+\./, '');
              })

              return json;
            }));
  }
  */
  function classRelations(params={}, queryName="classRelations") {
    params = _.clone(params);
    let apiCall = 'concepts';
    params.resultsSchema = resultsSchema;
    params.cdmSchema = cdmSchema;
    params.queryName = queryName;

    return (util.cachedPostJsonFetch(
            `${apiRoot}/${apiCall}Post`, params)
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.queryName, json.error.url);

              json.forEach(rec=>{
                rec.is_hierarchical = !!parseInt(rec.is_hierarchical, 10);
                rec.defines_ancestry = !!parseInt(rec.defines_ancestry, 10);
                rec.c1_ids = parseInt(rec.c1_ids, 10);
                rec.c2_ids = parseInt(rec.c2_ids, 10);
                rec.c= parseInt(rec.c, 10);
              })

              return json;
            }));
  }
  function conceptCount(params={}, queryName="conceptCount") {
    params = _.clone(params);
    let apiCall = 'concepts';
    params.resultsSchema = resultsSchema;
    params.cdmSchema = cdmSchema;
    params.queryName = queryName;

    return (util.cachedPostJsonFetch(
            `${apiRoot}/${apiCall}Post`, params)
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.queryName, json.error.url);
              if (json.length !== 1)
                console.error('unexpect result count', json, json.queryName, json.url);
              return parseInt(json[0].count, 10);
            }));
  }
  function conceptStats(params={}, queryName="conceptStats") {
    params = _.clone(params);
    let apiCall = 'concepts';
    params.resultsSchema = resultsSchema;
    params.cdmSchema = cdmSchema;
    params.queryName = queryName;
    return (util.cachedPostJsonFetch(
            `${apiRoot}/${apiCall}Post`, params)
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.queryName, json.error.url);

              json.forEach(rec=>{
                rec.conceptrecs = parseInt(rec.conceptrecs, 10);
                rec.dbrecs = parseInt(rec.dbrecs, 10);
                //rec.count = parseInt(rec.count, 10);
                //rec.table_name = rec.table_name.replace(/^[^\.]+\./, '');
              })

              return json;
            }));
  }
  /* from drug explorer app
  function recsfetch(params, queryName) {
    params = _.clone(params);
    let {concept_id, maxgap, } = params;
    if (!_.isNumber(concept_id)) throw new Error("need concept_id param, number");
    if (typeof maxgap !== "undefined") {
      params.maxgap = parseInt(maxgap, 10);
    }
    params.bundle = params.bundle || 'exp'; // or era or single

    params.aggregate = false;
    params.resultsSchema = 'omop5_synpuf_5pcnt_results';

    if (typeof params.person_id === 'undefined') {
      params.noLimit = false;
      params.limit = 5000;
    } else {
      params.noLimit = true;
    }
    params.queryName = queryName || 'no query name';

    return (util.cachedPostJsonFetch(
            //'http://localhost:3000/api/daysupplies/dsgpPost', params)
            'http://localhost:3000/api/cdms/sqlpost', params, queryName)
            
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.queryName, json.error.url);
              return json;
            }));
  }
  function distfetch(params, queryName) {
    params = _.clone(params);
    let {ntiles, concept_id, maxgap} = params;
    if (!_.isNumber(ntiles)) throw new Error("need ntiles param, number");
    if (!_.isNumber(concept_id)) throw new Error("need concept_id param, number");
    if (typeof maxgap !== "undefined") {
      params.maxgap = parseInt(maxgap, 10);
    }
    params.measurename = params.measurename || 'gap'; // or duration
    params.bundle = params.bundle || 'exp'; // or era or single

    params.aggregate = true;
    params.resultsSchema = 'omop5_synpuf_5pcnt_results';

    params.noLimit = true;

    params.queryName = queryName || 'no query name';

    return (util.cachedPostJsonFetch(
            //'http://localhost:3000/api/daysupplies/dsgpPost', params)
            'http://localhost:3000/api/cdms/sqlpost', params, queryName)
            
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.url);
              let recs = json.map( rec => {
                  rec.count = parseInt(rec.count, 10);
                  if (params.bundle === 'exp') {
                    rec.exp_num = parseInt(rec.exp_num, 10);
                  } else if (params.bundle === 'era') {
                    rec.era_num = parseInt(rec.era_num, 10);
                  } else if (params.bundle === 'allexp') {
                  } else if (params.bundle === 'allera') {
                  } else {
                    throw new Error("not handling yet");
                  }
                  rec.avg = parseFloat(rec.avg);
                  if (isNaN(rec.avg))
                    rec.avg = null;
                  return rec;
                }
              );
              recs.json = json;
              return recs;
              //var byExp = _.supergroup(recs, ['exp_num','ntile']);
              //return byExp;
            }));
  }
  function frequentUsers(params, queryName) {
    params = _.clone(params);
    let {concept_id, sampleCnt} = params;
    if (!_.isNumber(concept_id)) throw new Error("need concept_id param, number");
    if (!_.isNumber(sampleCnt)) throw new Error("need sampleCnt param, number");

    params.cdmSchema = 'omop5_synpuf_5pcnt';
    params.queryName = queryName;

    return (util.cachedPostJsonFetch(
            'http://localhost:3000/api/cdms/sampleUsersPost', params, queryName)
            .then(function(json) {
              if (json.error)
                console.error(json.error.message, json.error.queryName, json.error.url);
              return json;
            }));
  }
  */
  return {conceptCount, classRelations, conceptStats};
}