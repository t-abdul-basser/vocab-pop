// @ flow // flow breaking on new.target, so not using right now

const DEBUG = true;
import React, { Component } from 'react';
import {render} from 'react-dom';
//import {VocNode, VocEdge} from './VocabMap';
var d3 = require('d3');
var $ = require('jquery'); window.$ = $;
import _ from 'supergroup'; // just for lodash
import Rx from 'rxjs/Rx';
import {sigmaReactRenderer} from './sigma-react/sigma.renderers.react_second_try';

//export {default} from './sigma-react/sigma.renderers.react';
function getObjectDiff(obj1, obj2) {
    const diff = Object.keys(obj1).reduce((result, key) => {
        if (!obj2.hasOwnProperty(key)) {
            result.push(key);
        } else if (_.isEqual(obj1[key], obj2[key])) {
            const resultKeyIndex = result.indexOf(key);
            result.splice(resultKeyIndex, 1);
        }
        return result;
    }, Object.keys(obj2));

    return diff;
}

export default class SigmaReactGraph extends Component {
  constructor(props) {
    super(props);
    this.sigma = sigmaReactRenderer();
    //this.sigmaInstance = new this.sigma({graph:{nodes,edges}});
    this.sigmaInstance = new this.sigma();
    this.cam = this.sigmaInstance.addCamera();
    /*
    this.renderer.settings = 
      this.renderer.settings.embedObjects(options, {
          prefix: this.renderer.saveParams.options.prefix,
          forceLabels: this.renderer.saveParams.options.forceLabels
        });
    */
    this.state = {};
    DEBUG && (window.srg = this);
  }
  options(domRefs) {
    let rendererOpts = Object.assign(
      { id:'main',
        //defaultNodeType, defaultEdgeType,
        // FIX ALL THIS
        defaultNodeColor:'darkkhaki',
        defaultNodeHoverColor:'crimson',
        defaultNodeHoverStrokeColor:'green',
        defaultNodeMuteColor:'#AAA',
        defaultLabelColor:'darkred',
        defaultLabelNeighborColor:'crimson',
        defaultEdgeColor:'darkslateblue',

        defaultLabelSize:16,
        labelSize:'proportional',
        labelThreshold:2,
        //labelFontSizeThreshold:2,
        labelSizeRatio:3,
        cameraRatio:.7,
        drawLabels:false,
        drawEdgeLabels:false,
        edgeColor:'target',
        hideEdgesOnMove:true, }, this.props);
    let opts = {  //container: this.graphDiv,
                  type: 'react',
                  camera: this.cam,
                  //freeStyle: true
                  settings: rendererOpts,
                  domRefs,
                  };
    return opts;
  }
  componentDidMount() {
    const {width, height, nodes} = this.props;
    if (width && height && nodes) {
      this.setState({forceUpdate:true});
    }
  }
  componentDidUpdate(prevProps, prevState) {
    // too many updates, need to fix
    console.log('prop/state diffs', 
                getObjectDiff(prevProps, this.props),
                getObjectDiff(prevState, this.state));
    let {nodes=[], edges=[], className='',style='',
          width, height} = this.props;
    if (!this.renderer) {
      if (nodes.length && width && height) {
        this.renderer = 
          this.sigmaInstance.addRenderer(
            this.options({
              div: this.graphDiv, svg:this.graphSvg,
            }));
      } else {
        return;
      }
    }
    if (!_.isEqual(prevProps.nodes, nodes)) {
      this.renderer.graph.clear();
      this.renderer.graph.read({nodes,edges});
      this.sigmaInstance.refresh();
      //this.setState({nodes:nodes});
    }
  }
  render() {
    let settings = (this.renderer || this.sigmaInstance).settings;
    let graph = (this.renderer || this.sigmaInstance).graph;
    let props = Object.assign({},this.props, this.state);
    let {nodes=[], edges=[], className='',style='',
          width, height} = props;
    console.log(`rendering SigmaReactGraph with ${nodes.length} nodes`);
    let svg = '';
    if (nodes.length && width && height) {
      svg = <SrgSvg 
              parentWantsRef={refToParent(this,'graphSvg')}
              {...{graph, settings, width, height, nodes,
                    edges, style, className,}} />;
    }
    //let children = React.cloneElement( this.props.children, props);
                  //eventHandlers={[this.setHoverNode.bind(this)]}
                  //renderer={renderer}
                  //refFunc={(div=>{ this.graphDiv=div; if (refFunc) refFunc(div); }).bind(this)} 
    return  <ListenerNode wrapperTag="div" className={className} style={style} 
                  eventsToHandle={['onMouseMove']}
                  parentWantsRef={refToParent(this,'graphDiv')}
                  >
              {svg}
            </ListenerNode>;
  }
}
function refToParent(parent, parentProp) {
  return (ref=>parent[parentProp]=ref).bind(parent);
}
class SrgSvg extends Component {
  render() {
    let {graph, settings, width, height, nodes,
          edges, style, parentWantsRef, className, hoverNode,
        } = this.props;
    if (!(graph && settings && nodes.length && width && height)) {
      console.log("don't have all props for svg");
      return null;
    }
    console.log(`rendering SrgSvg with ${nodes.length} nodes`);
    let classPrefix = settings('classPrefix');
    return <svg {...{width, height}} 
                ref={parentWantsRef}
                className={classPrefix+'-svg'}>
              <SigmaGroup grp='nodes' settings={settings} >
                {graph.nodes().map(
                  node => <SigmaNode key={node.id} node={node} settings={settings} 
                                      getNodeState={this.getNodeState.bind(this)}
                            />)}
              </SigmaGroup>
              <SigmaGroup grp='edges' settings={settings} >
                {graph.edges().map(
                  edge => <SigmaEdge key={edge.id} edge={edge} settings={settings} 
                              source={graph.nodes(edge.source)}
                              target={graph.nodes(edge.target)}
                              getEdgeState={this.getEdgeState.bind(this)}
                            />)}
              </SigmaGroup>
              <SigmaGroup grp='labels' settings={settings} >
                {graph.nodes().map(
                  node => <SigmaLabel key={node.id} node={node} settings={settings} 
                                      getNodeState={this.getNodeState.bind(this)}
                            />)}
              </SigmaGroup>
              <SigmaGroup grp='hovers' settings={settings} >
                <text>hi</text>
                { hoverNode &&
                    <SigmaHover node={hoverNode} settings={settings} 
                        getNodeState={this.getNodeState.bind(this)}
                    /> || ''}
              </SigmaGroup>
              <canvas className={classPrefix+'-measurement-canvas'} />
            </svg>
  }
}
export function firstLastEvent(rxSubj, ms) {
  return (Rx.Observable.merge(rxSubj.debounceTime(ms), rxSubj.throttleTime(ms))
          .distinctUntilChanged());
}
/*
    confusing, but here's what I think is happening:

    - data is composed into plain js node/edge objects
      - nodes generally have 
        - a nodeData property containing the actual data the node represents
        - id, x, y, label, and stuff nodes need for rendering
        - optionally, a NodeClass property with the react component class
          to be rendered inside the dom element sigma creates for that node;
          NodeClass should subclass MacroNode
        - optionally, a type property; IF the node/edge type has a definition
          in sigmaReactRenderer, it will be rendered with the NodeClass (or EdgeClass);
          if not, it will just be a regular sigma node/edge
      - edges have a source node id and target node id

    - a SigmaReactGraph is made with properties:
      - nodes/edges described above


    and then inside that will be a ReactInsideSigmaNode component
*/

export class SigmaNode extends Component {
  //constructor(props) { super(props); this.state = {}; }
  render() {
    const {node, settings, eventProps, getNodeState} = this.props;
    if (node.hideNode) return null;
    let prefix = settings('prefix');
    let gClass = settings('classPrefix') + '-node'
                  + (node.classes ? ' ' + node.classes : '');
    let circleClass = settings('classPrefix') + '-node-circle';

    let nodeState = getNodeState(node);
    // FIX COLOR STUFF!  css?
    let fill = nodeState.hover && settings('defaultNodeHoverColor') 
                || nodeState.hoverNeighbor && 'pink' 
                || nodeState.muted && settings('defaultNodeMuteColor')
                || node.color || settings('defaultNodeColor');
    let strokeWidth = nodeState.hover || nodeState.hoverNeighbor ? 4 : 0;
    let stroke = nodeState.hover && settings('defaultNodeHoverStrokeColor') 
                || nodeState.hoverNeighbor && 'purple';
    //console.log(node.id, nodeState);
    let size = node[prefix + 'size'];
    let x = node[prefix+'x'];
    let y = node[prefix+'y'];
    if (typeof x === 'undefined') throw new Error('no x');

    let NodeClass = node.NodeClass || ListenerTarget;
    let content = node.NodeClass ? ''
          : <circle {...{fill, stroke, strokeWidth}} r={size} className={circleClass} data-node-id={node.id} />;
    console.log("SigmaNode", content);
    return  <NodeClass {...this.props} size={size}  className={gClass} 
                wrapperProps={{ ['data-node-id']:node.id,
                                transform:`translate(${x},${y})`, }}
                  eventProps={eventProps} wrapperTag='g'>
              {content}
            </NodeClass>;
      /*
      ?  <NodeClass {...{node, size, fill, stroke, strokeWidth}} data-node-id={node.id} />
      const circleSizeRange = [3,10];
      const size = d3.scaleLinear().domain(settings('sizeDomain'))
                                   .range(circleSizeRange);
      const scaleFactor = node[`${prefix}size`] / node.size;
      */
  }
}
export class SigmaLabel extends Component {
  //constructor(props) { super(props); this.state = {}; }
  render() {
    const {node, settings, eventProps, getNodeState} = this.props;
    let prefix = settings('prefix');
    let size = node[prefix + 'size'];
    let gClass = settings('classPrefix') + '-label'
                  + (node.classes ? ' ' + node.classes : '');
    let textClass = settings('classPrefix') + '-node-text';

    let nodeState = getNodeState(node);
    if (nodeState.hover) return null;
    if (!settings('forceLabels') && size < settings('labelThreshold'))
      return null;

    var fontSize = (settings('labelSize') === 'fixed') ?
          settings('defaultLabelSize') :
          settings('labelSizeRatio') * size;
    fontSize = fontSize * (nodeState.hoverNeighbor && 1.2 
                            || nodeState.muted && 0.8
                            || 1);
    let fontFamily = settings('font');
    var normalLabelColor = (settings('labelColor') === 'node') ?
                              (node.color || settings('defaultNodeColor')) :
                              settings('defaultLabelColor');

    // FIX COLOR STUFF!  css?
    let fill =  nodeState.hoverNeighbor && settings('defaultLabelNeighborColor')
                || nodeState.muted && settings('defaultNodeMuteColor')
                || normalLabelColor;
    //console.log(node.id, nodeState);
    let x = node[prefix+'x'] + size + 3;
    let y = node[prefix+'y'] + fontSize / 3;
    if (typeof x === 'undefined') throw new Error('no x');

    let LabelClass = node.LabelClass || ListenerTarget;
    return  <LabelClass wrapperTag='g' {...this.props}  className={gClass} 
                wrapperProps={{ ['data-label-target']:node.id,
                                transform:`translate(${x},${y})`, }}
                  eventProps={eventProps} >
                <text {...{fontSize, fill, fontFamily,}} className={textClass} 
                    data-label-target={node.id} 
                    data-node-id={node.id} 
                >
                  {node.label}
                </text>
            </LabelClass>;
  }
}
export class SigmaHover extends Component {
  render() {
    const {node, settings, eventProps, getNodeState, children} = this.props;
    var prefix = settings('prefix') || '',
        size = node[prefix + 'size'],
        gClass = settings('classPrefix') + '-hover'
                  + (node.classes ? ' ' + node.classes : '');

    /*

    //let nodeState = getNodeState(node);
    //if (nodeState.hover) return null;

    var fontSize = (settings('labelSize') === 'fixed') ?
          settings('defaultLabelSize') :
          settings('labelSizeRatio') * size;
    fontSize = fontSize * (nodeState.hoverNeighbor && 1.2 
                            || nodeState.muted && 0.8
                            || 1);
    let fontFamily = settings('font');
    var normalLabelColor = (settings('labelColor') === 'node') ?
                              (node.color || settings('defaultNodeColor')) :
                              settings('defaultLabelColor');

    // FIX COLOR STUFF!  css?
    let fill =  nodeState.hoverNeighbor && settings('defaultLabelNeighborColor')
                || nodeState.muted && settings('defaultNodeMuteColor')
                || normalLabelColor;
    //console.log(node.id, nodeState);
    let x = node[prefix+'x'];
    let y = node[prefix+'y'];
    */

    let HoverClass = node.HoverClass || ListenerTarget; // expected to be FoHover for now
    return  <HoverClass
              {...Object.assign({},this.props, {className:gClass})} >
              {children}
            </HoverClass>;
  }
}
export class SigmaEdge extends Component {
  render() {
    const {edge, source, target, settings, eventProps, getEdgeState, } = this.props;
    //let circleClass = settings('classPrefix') + '-node-circle';
    var color = edge.color,
        prefix = settings('prefix') || '',
        edgeColor = settings('edgeColor'),
        defaultNodeColor = settings('defaultNodeColor'),
        defaultEdgeColor = settings('defaultEdgeColor');
    let gClass = settings('classPrefix') + '-edge';
    let lClass = settings('classPrefix') + '-edge-line';

    let edgeState = getEdgeState(edge);
    let strokeWidth = (edge[`${prefix}size`] || 1) / (edgeState.muted ? 2 : 1);
    let stroke = edgeState.sourceHover && settings('defaultNodeHoverColor') 
                || edgeState.targetHover && 'pink' 
                || edgeState.muted && settings('defaultNodeMuteColor')
                || edge.color || settings('defaultEdgeColor');

    let EdgeClass = edge.EdgeClass || ListenerTarget;

    return  <EdgeClass {...this.props} wrapperTag='g' className={gClass} data-edge-id={edge.id} >
              <line   {...{stroke, strokeWidth}}
                      className={lClass} data-node-id={edge.id} 
                      x1={source[prefix + 'x']}
                      y1={source[prefix + 'y']}
                      x2={target[prefix + 'x']}
                      y2={target[prefix + 'y']}
              />
            </EdgeClass>;
              
      /*
        line.style.display = '';
      const circleSizeRange = [3,10];
      const size = d3.scaleLinear().domain(settings('sizeDomain'))
                                   .range(circleSizeRange);
      const scaleFactor = node[`${prefix}size`] / node.size;
      */
  }
}
export class SigmaGroup extends Component {
  render() {
    const {grp, settings, children} = this.props;
    let c = settings('classPrefix');
    return (<g id={`${c}-group-${grp}`} className={`${c}-group`} >
              {children}
            </g>);
  }
}
export class FoLabel extends Component {
  render() {
    return <ForeignObject {...this.props} />;
  }
}
export class FoNode extends Component {
  render() {
    return <ForeignObject {...this.props} />;
  }
}
export class FoHover extends Component {
  render() {
    return <ForeignObject {...this.props} />;
  }
}
export class ForeignObject extends Component {
  constructor(props) {
    super(props);
    this.state = {w:0, h:0, updates:0, styles: {}};
  }
  componentDidMount() {
    const {node, } = this.props;
    this.resizeFo();
    //node.resizeFo = this.resizeFo.bind(this);
  }
  resizeFo() {
    const {node, settings} = this.props;
    let {w, h, styles} = this.state;
    styles = _.cloneDeep(styles); // not to mutate existing state...probably doesn't matter
    //const {fontSize, fontColor, fontFamily} = styles;
    if (!this.foDiv) {
      console.log('no foDiv for resizing', node.id);
      return {w:0,h:0};
    }
    const fontStyles = this.fontStyles();
    Object.assign(styles, fontStyles);
    const {fontSize, fontColor, fontFamily} = fontStyles;
    // Case when we don't want to display the fo
    if (!settings('forceLabels') && 
          fontSize < settings('labelFontSizeThreshold')) {
      styles.display = 'none';
      [w,h] = [0,0];
    } else {
      [w,h] = getSize(this.foDiv);
    }
    console.log(w,h);
    this.setState({styles, w, h});
    return {w,h, styles};
  }
  fontStyles() {
    const {node, settings} = this.props;
    const {fontSize, fontColor, } = this.state.styles;
    let size = node.size;
    let fs = (settings('labelSize') === 'fixed')
                      ? settings('defaultLabelSize')
                      : settings('fontFromSize')(size);
    let fc = (settings('labelColor') === 'node')
                      ? (node.color || settings('defaultNodeColor'))
                      : settings('defaultLabelColor');
    let fontFamily = settings('font');
    return {fontSize:fs, fontColor:fc, fontFamily};
  }
  render() {
    const {children, eventHandlers=[], settings, node, wrapperProps} = this.props;
    let {w, h, styles} = this.state;
    const {fontSize, fontColor, } = styles;
    const foClass = settings('classPrefix') + '-fo';
    const divClass = settings('classPrefix') + '-fo-div';
    let prefix = settings('prefix');
    let size = node[prefix + 'size'];
    /*
    return <g data-node-id={node.id} data-el={this}>
              <foreignObject className={className} width={w} height={h} >
                <div className={className + '-div'}
                      ref={d=>this.foDiv=d} style={this.state.styles} >
                  {children}
                </div>
              </foreignObject>
           </g>;
    */
    let x = node[prefix+'x'] - w / 2;
    let y = node[prefix+'y'] - h / 2;
    if (typeof x === 'undefined') throw new Error('no x');
    return  <g transform={`translate(${x},${y})`} >
              <foreignObject className={foClass} width={w} height={h} >
                <ListenerTarget wrapperTag="div" {...wrapperProps} style={styles}
                      data-node-id={node.id}
                      className={divClass} refFunc={(d=>this.foDiv=d).bind(this)}
                      eventHandlers={eventHandlers.concat(this.resizeFo.bind(this))} >
                  {children}
                </ListenerTarget>;
            </foreignObject>
          </g>;
    //<div className={className + '-div'} ref={d=>this.foDiv=d} style={styles} > </div>
    if (this.props.needsRect) {
      throw new Error("fix this");
      //return  <g><rect className="edge-cover" />{fo}</g>;
    }
  }
}

function getSize(dn) {
  let cbr = dn.getBoundingClientRect(), 
      rw = Math.round(cbr.width),
      rh = Math.round(cbr.height);
  return [rw,rh];
}

export class ListenerTarget extends Component {
  constructor(props) {
    super();
    this.targetId = ListenerTarget.nextId++;
    ListenerTarget.targets[this.targetId] = this;
  }
  render() {
    //const {wrapperTag='g', wrapperProps, children, refFunc=d=>this.elRef=d, className } = this.props;
    const {wrapperTag='g', wrapperProps, children, 
            parentWantsRef=d=>d, className } = this.props;
    const Tag = wrapperTag; // should be an html or svg tag, i think, not compoent
              //{React.cloneElement(this.props.children, this.props)}
    return  <Tag className={(className||'')+" listener-target"} ref={parentWantsRef} 
                  data-target-id={this.targetId} {...wrapperProps}>
              {children}
            </Tag>;
  }
}
ListenerTarget.nextId = 0;
ListenerTarget.targets = [];
function findTarget(el) {
  if (el.classList.contains('listener-target'))
    return [ListenerTarget.targets[el.getAttribute('data-target-id')], el];
  if (el.classList.contains('listener-node'))
    return [null,null];
  if (el.parentNode)
    return findTarget(el.parentNode);
}

export class ListenerNode extends Component {
  constructor(props) {
    super(props);
    // react events to handle -- https://facebook.github.io/react/docs/events.html#mouse-events
    let eventsToHandle = props.eventsToHandle || 
      [ 'onClick', 'onMouseEnter', 'onMouseLeave', 'onMouseMove'];
    this.state = {
      eventsToHandle,
    };
  }
  dispatch(e) {
    console.log("BROKEN -- shouldn't need a renderer");
    /*
    const {eventHandlers=[], renderer } = this.props;
    let [target,targetEl] = findTarget(e.target);
    let node;
    if (target && target.props.node) {
      node = target.props.node;
    } else if (target && target.props["data-node-id"]) {
      console.log("FIX?");
      node = renderer.graph.nodes(target.props["data-node-id"]);
    } else if (targetEl && targetEl.getAttribute('data-node-id')) {
      node = renderer.graph.nodes(targetEl.getAttribute('data-node-id'));
    }
    //console.log('node', target||'none',);
    eventHandlers.forEach( l => l(e, node, target, this.props));
    */


    /*
    if (!sigmaDomEl || document.body.contains(sigmaDomEl)) {
      eventHandlers.forEach( l => l(e, this.props));
    } else {
      console.log(`can't handle ${e.type} because ListenerNode no longer on page`);
    }
    */
  }
  render() {
    const {wrapperTag='g', children, parentWantsRef=d=>d, className } = this.props;
    let eventsToHandle = this.props.eventsToHandle || this.state.eventsToHandle;
    const reactEventypes = _.fromPairs(
      eventsToHandle.map(eventType=> [eventType,this.dispatch.bind(this)]));
    const Tag = wrapperTag; // should be an html or svg tag, i think, not compoent
    return  <Tag className={'listener-node ' + (className||'') } 
                {...reactEventypes} 
                ref={parentWantsRef}>
              {children}
            </Tag>;
  }
}
/*
export class GNode extends Object {
  constructor(props) {
    super();
    let cls = new.target.name;
    console.log(this.propsRequired);
    console.log(this.propsRequired());
    _.extend(this, props);
    console.log(this.propsRequired);
    console.log(this.propsRequired());
    _.each(this.propsRequired(),
      (v,k) => {
        if (typeof v === 'string') {
          if (typeof this[k] !== v) 
            throw new Error(`${cls} requires ${k} ${v} prop`);
        } else if (typeof v === 'function') {
          if (!(this[k] instanceof v)) 
            throw new Error(`${cls} requires ${k.name} prop`);
        } else {
          throw new Error("weird requirement");
        }
    });
  }
  propsRequired() {
    return {
      id: 'string',
    }
  }
  toString() {
    return this.id;
  }
}
export class Edge extends Node {
  constructor(props) {
    super(props);
    this.id = this.id || `${this.source}->${this.target}`;
  }
  propsRequired() {
    return {
      source: Node,
      target: Node,
    }
  }
}
*/

