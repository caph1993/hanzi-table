//@ts-check
/// <reference path="./put.js" />


const cp = (() => {
  const put = (()=>{
    let forDocument, fragmentFasterHeuristic = /[-+,> ]/;
    let selectorParse = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w\u00A0-\uFFFF%$|]+)?(?:\[([^\]=]+)=?('(?:\\.|[^'])*'|"(?:\\.|[^"])*"|[^\]]*)\])?/g,
      undefined, namespaceIndex, namespaces = /**@type {*}*/(false),
      doc = document,
      ieCreateElement = typeof doc.createElement == "object"; // telltale sign of the old IE behavior with createElement that does not support later addition of name 
    function insertTextNode(element, text) {
      element.appendChild(doc.createTextNode(text));
    }
    /** @type {(...args)=>HTMLElement}*/
    function put(topReferenceElement) {
      let fragment, lastSelectorArg, nextSibling, referenceElement, current,
        args = arguments,
        returnValue = args[0]; // use the first argument as the default return value in case only an element is passed in
      function insertLastElement() {
        // we perform insertBefore actions after the element is fully created to work properly with 
        // <input> tags in older versions of IE that require type attributes
        //	to be set before it is attached to a parent.
        // We also handle top level as a document fragment actions in a complex creation 
        // are done on a detached DOM which is much faster
        // Also if there is a parse error, we generally error out before doing any DOM operations (more atomic) 
        if (current && referenceElement && current != referenceElement) {
          (referenceElement == topReferenceElement &&
            // top level, may use fragment for faster access 
            (fragment ||
              // fragment doesn't exist yet, check to see if we really want to create it 
              (fragment = fragmentFasterHeuristic.test(argument) && doc.createDocumentFragment()))
            // any of the above fails just use the referenceElement  
            ? fragment : referenceElement).
            insertBefore(current, nextSibling || null); // do the actual insertion
        }
      }
      for (let i = 0; i < args.length; i++) {
        var argument = args[i];
        if (typeof argument == "object") {
          lastSelectorArg = false;
          if (argument instanceof Array) {
            // an array
            current = doc.createDocumentFragment();
            for (let key = 0; key < argument.length; key++) {
              current.appendChild(put(argument[key]));
            }
            argument = current;
          }
          if (argument.nodeType) {
            current = argument;
            insertLastElement();
            referenceElement = argument;
            nextSibling = 0;
          } else {
            // an object hash
            for (let key in argument) {
              current[key] = argument[key];
            }
          }
        } else if (lastSelectorArg) {
          // a text node should be created
          // take a scalar value, use createTextNode so it is properly escaped
          // createTextNode is generally several times faster than doing an escaped innerHTML insertion: http://jsperf.com/createtextnode-vs-innerhtml/2
          lastSelectorArg = false;
          insertTextNode(current, argument);
        } else {
          if (i < 1) {
            // if we are starting with a selector, there is no top element
            topReferenceElement = null;
          }
          lastSelectorArg = true;
          let leftoverCharacters = argument.replace(selectorParse, function (t, combinator, prefix, value, attrName, attrValue) {
            if (combinator) {
              // insert the last current object
              insertLastElement();
              if (combinator == '-' || combinator == '+') {
                // + or - combinator, 
                // TODO: add support for >- as a means of indicating before the first child?
                referenceElement = (nextSibling = (current || referenceElement)).parentNode;
                current = null;
                if (combinator == "+") {
                  nextSibling = nextSibling.nextSibling;
                }// else a - operator, again not in CSS, but obvious in it's meaning (create next element before the current/referenceElement)
              } else {
                if (combinator == "<") {
                  // parent combinator (not really in CSS, but theorized, and obvious in it's meaning)
                  referenceElement = current = (current || referenceElement).parentNode;
                } else {
                  if (combinator == ",") {
                    // comma combinator, start a new selector
                    referenceElement = topReferenceElement;
                  } else if (current) {
                    // else descendent or child selector (doesn't matter, treated the same),
                    referenceElement = current;
                  }
                  current = null;
                }
                nextSibling = 0;
              }
              if (current) {
                referenceElement = current;
              }
            }
            let tag = !prefix && value;
            if (tag || (!current && (prefix || attrName))) {
              if (tag == "$") {
                // this is a variable to be replaced with a text node
                insertTextNode(referenceElement, args[++i]);
              } else {
                // Need to create an element
                tag = tag || put.defaultTag;
                let ieInputName = ieCreateElement && args[i + 1] && args[i + 1].name;
                if (ieInputName) {
                  // in IE, we have to use the crazy non-standard createElement to create input's that have a name 
                  tag = '<' + tag + ' name="' + ieInputName + '">';
                }
                // we swtich between creation methods based on namespace usage
                current = namespaces && ~(namespaceIndex = tag.indexOf('|')) ?
                  doc.createElementNS(namespaces[tag.slice(0, namespaceIndex)], tag.slice(namespaceIndex + 1)) :
                  doc.createElement(tag);
              }
            }
            if (prefix) {
              if (value == "$") value = args[++i];
              if (prefix == "#") current.id = value;
              else {
                let currentClassName = current.className;
                let removed = currentClassName && (" " + currentClassName + " ").replace(" " + value + " ", " ");
                if (prefix == ".") {
                  current.className = currentClassName ? (removed + value).substring(1) : value;
                } else {
                  // else a '!' class removal
                  if (argument == "!") {
                    let parentNode;
                    // special signal to delete this element
                    if (ieCreateElement) {
                      // use the ol' innerHTML trick to get IE to do some cleanup
                      put("div", current, '<').innerHTML = "";
                    } else if (parentNode = current.parentNode) { // intentional assigment
                      // use a faster, and more correct (for namespaced elements) removal (http://jsperf.com/removechild-innerhtml)
                      parentNode.removeChild(current);
                    }
                  } else {
                    // we already have removed the class, just need to trim
                    removed = removed.substring(1, removed.length - 1);
                    // only assign if it changed, this can save a lot of time
                    if (removed != currentClassName) {
                      current.className = removed;
                    }
                  }
                }
                // CSS class removal
              }
            }
            if (attrName) {
              if (attrValue && (attrValue.charAt(0) === '"' || attrValue.charAt(0) === "'")) {
                // quoted string
                attrValue = attrValue.slice(1, -1).replace(/\\/g, '')
              }
              if (attrValue == "$") {
                attrValue = args[++i];
              }
              // [name=value]
              if (attrName == "style") {
                // handle the special case of setAttribute not working in old IE
                current.style.cssText = attrValue;
              } else {
                let method = attrName.charAt(0) == "!" ? (attrName = attrName.substring(1)) && 'removeAttribute' : 'setAttribute';
                // determine if we need to use a namespace
                namespaces && ~(namespaceIndex = attrName.indexOf('|')) ?
                  current[method + "NS"](namespaces[attrName.slice(0, namespaceIndex)], attrName.slice(namespaceIndex + 1), attrValue) :
                  current[method](attrName, attrValue);
              }
            }
            return '';
          });
          if (leftoverCharacters) {
            throw new SyntaxError("Unexpected char " + leftoverCharacters + " in " + argument);
          }
          insertLastElement();
          referenceElement = returnValue = current || referenceElement;
        }
      }
      if (topReferenceElement && fragment) {
        // we now insert the top level elements for the fragment if it exists
        topReferenceElement.appendChild(fragment);
      }
      return returnValue;
    }
    put.addNamespace = function (name, uri) {
      // @ts-ignore
      if (doc.createElementNS) {
        (namespaces || (namespaces = {}))[name] = uri;
      }
      // @ts-ignore for old IE
      else doc.namespaces.add(name, uri);
    };
    put.defaultTag = "div";
    put.forDocument = forDocument;
    return put;
  })();

  const head = document.querySelector('#cpToolsHead') || put(document.head, 'div#cpToolsHead');

  const sleep = async (/** @type {number} */ ms) => (
    await new Promise(resolve => setTimeout(resolve, ms))
  );

  const html = (()=>{
    const parsers = {
      katex: [/(\$\$.*?\$\$|\$.*?\$)/gs, async m=>{
        const displayMode = m.startsWith("$$");
        const skip = displayMode?2:1;
        const formula = m.slice(skip, -skip);
        const e = put('div');
        const katex = await cp.load('katex');
        katex.render(formula, e, {throwOnError: false, displayMode});
        return e.firstChild;
      }],
      code: [/\\\`\\\`\\\`(.*?)\\\`\\\`\\\`/gs, async m=>{
        const code = m.slice(6,-6).trim().replace(/^.*?\n(.*)$/gs, '$1');
        const options = {mode:'text/javascript'};
        const putCodemirror = await cp.load('putCodemirror');
        return putCodemirror(code, options);
      }],
      codeInline: [/\\\`(.*?)\\\`/g, m=>html`<code>${m[1]}</code>`]
    }

    /** @typedef {string|number|boolean|Node|{[key:string]:any}} _T0 */
    /** @typedef {_T0|Promise<_T0>} _T1 */
    /** @typedef {_T1|_T1[]} _T2 */
    /** 
     * @param {TemplateStringsArray} htmlTemplateString
     * @param {_T2[]} variables
     * @returns {Node[]}
     * */
    function parse(htmlTemplateString, ...variables){
      let wrapper = document.createElement('div');
      let /** @type {readonly string[]}*/ htmlSeq = (htmlTemplateString.raw||htmlTemplateString);
      let varKey = 'placeholderForPutVariable';
      let html = htmlSeq.join(`<div ${varKey}></div>`)
      // Comments shift placeholder replacements
      html = html.replace(/<!--.*?-->/gs, '');
      const values = {};
      const valuesIdx = {};
      for(let key of Object.keys(parsers)){
        const [reg, elemFactory] = parsers[key];
        values[key] = [];
        valuesIdx[key] = 0;
        html = html.replace(reg, m=>{
          values[key].push(elemFactory(m));
          return `<div ${varKey}="${key}"></div>`
        });
      }
      html = html.replace(/\s*\n(\s*\n)+/g, '<div class="parBreak"></div>');
      wrapper.innerHTML = html;
      values[''] = variables;
      valuesIdx[''] = 0;
      let replacements = [];
      const dfs = (/** @type {Node}*/root)=>{
        for(let child of root.childNodes){
          const isPlaceholder = (
            child.nodeName=="DIV"
            && child instanceof HTMLElement
            && child.attributes[varKey]
          );
          if(!isPlaceholder) dfs(child);
          else{
            const key = isPlaceholder.value;
            const value = values[key][valuesIdx[key]++];
            replacements.push({element:child, value});
          }
        }
      }
      dfs(wrapper);

      for(let {element, value} of replacements){
        let values = (Array.isArray(value)? value:[value]).map(v=>{
          if(v instanceof Promise){
            const tmpDiv = document.createElement('div');
            v.then(value=>tmpDiv.replaceWith(...parse`${value}`));
            return tmpDiv;
          }
          if(v instanceof Node) return v;
          return putText(v);
        });
        element.replaceWith(.../**@type {*}*/(values));
      }
      // DOES NOT WORK for td nor th!!!
      return [...wrapper.childNodes];
    }

    /** 
     * @param {_T1} text$
     * @returns {Text}
     * */
    function putText(text$){
      const parseText = (v)=>{
        if (typeof v === 'string') return v;
        if(v instanceof String) return v.toString();
        if(Number.isFinite(v)) return `${v}`;
        if(!v) '';
        return JSON.stringify(v);
      }
      const elem = document.createTextNode('');
      if(text$ instanceof events.EventTrigger){
        text$.listen(async text => elem.textContent=parseText(text));
      } else elem.textContent=parseText(text$);
      return elem;
    }
    return parse;
  })();


  /** @template T
   @param {number?} timeout
   @param {(resolve: (value: T) => void, reject: (reason?: any) => void) => void} f
  */
  const timeoutPromise = (timeout, f) => (
    new Promise((resolve, reject) => {
      f(resolve, reject);
      if (timeout) setTimeout(() => reject('timeout'), timeout);
    })
  );

  async function untilTimed(/** @type {()=>any}*/ func, { ms = 200, timeout = 0 } = {}) {
    if (timeout && ms > timeout) ms = timeout / 10;
    let t0 = (new Date()).getTime();
    let value;
    while (!(value = await func())) {
      if (timeout && (new Date()).getTime() - t0 > timeout)
        throw 'timeout';
      await sleep(ms);
    }
    return value;
  }

  const events = (() => {
    class EventTrigger extends EventTarget {
      /** @param {any?} value */
      trigger(value = undefined) {
        this.lastValue = value;
        this.dispatchEvent(new Event(''));
      }
      /**
       * if the event is fired many times while onEvent is running, it will wait and fire only the last call.
       * @param {(value?) => Promise<any>} onEvent
       */
      listen(onEvent) {
        let awaiting = false;
        let pendingCall;
        const onEventLast = () => {
          if (awaiting) return pendingCall = onEvent;
          awaiting = true;
          pendingCall = null;
          onEvent(this.lastValue).finally(() => {
            awaiting = false;
            if (pendingCall) this.dispatchEvent(new Event(''));
          })
        }
        this.addEventListener('', onEventLast);
        return onEventLast;
      }

      /** @template T  @param {()=>T} callable @returns {Promise<NonNullable<T>>}*/
      until(callable, timeout = null) {
        const out = callable();
        if (out) return new Promise(resolve => resolve(out));
        return timeoutPromise(timeout, resolve => {
          const onLoad = () => {
            const out = callable();
            if (!out) return;
            resolve(out);
            this.removeEventListener('', onLoad);
          }
          this.addEventListener('', onLoad);
        });
      }
    }
    const events = { EventTrigger };
    return events;
  })();

  const utils = (() => {
    const getUrl = (/** @type {string}*/path) => {
      return new URL(path, document.baseURI).href;
    }
    /** https://github.com/Microsoft/TypeScript/issues/23405#issuecomment-873331031 */
    /** @template T  @param {T} value @param {string} [valueName] @returns {T extends undefined ? never : T} */
    function assertDef(value, valueName) {
      if (value === undefined) {
        throw new Error(`Encountered unexpected undefined value${valueName? ` for '${valueName}'` : ""}`);
      }
      return /** @type {*} */ (value);
    }
    /** @template T @param {T} value @returns {T extends null ? never : T} */
    function assertNonNull(value) {
      if (!value && (value===null||value === undefined)) throw new Error(`Encountered unexpected undefined value`);
      return /** @type {*} */ (value);
    }
    /** @template T @param {T} value @returns {T extends null ? never : T} */
    function nonNull(value) { return /** @type {*} */ (value); }
    /** @type {(n: number) => number[]} */
    function range(n) {
      return [...Array(n).fill(0)].map((x,i)=>i);
    }
    /** @type {(obj: any) => obj is String} */
    function isString(obj) {
      return Object.prototype.toString.call(obj) === "[object String]";
    }
    function rand32(){
      return Math.floor(Math.random()*(1<<32))
    }
    /** random string of letters only */
    const randAZ = (/** @type {number} */ length) => {
      const rand = crypto.getRandomValues(new Uint8Array(length * 2));
      let out = btoa(String.fromCharCode(...rand)).replace(/[+/]|\d/g, "");
      if (out.length < length) out += randAZ(length);
      return out.substring(0, length);
    }
    const utils = { getUrl, sleep, assertDef, assertNonNull, nonNull, range, isString, rand32, randAZ };
    return utils;
  })();

  const scripts = (() => {
    const getScriptUrl = (/** @type {string?}*/path) => {
      // if(url.startsWith('./')) url += `?${_randomSessionSuffix}`;
      let src = path;
      if (!src) {
        const script = document.currentScript;
        if (!script) throw '';
        src = script['src'];
        if (!src) throw '';
      }
      let url = utils.getUrl(src);
      if (!url.endsWith('.js')) throw 'only .js files can be loaded';
      return url;
    }
    const _loaded = new events.EventTrigger();
    const _declared = {};
    const _scriptPromises = {};
    /** @param {()=>(any|Promise<any>)} code */
    const define = async (code) => {
      const key = getScriptUrl();
      _declared[key] = true;
      const codePromise = (async () => await code());
      _scriptPromises[key] = _scriptPromises[key] || codePromise();
      const value = await _scriptPromises[key];
      _loaded.trigger();
      // console.log('Defined', key);
      return value;
    }
    const load = async (/** @type {string} */ path) => {
      const key = getScriptUrl(path);
      // console.log('Loading', key);
      if (!_declared[key]) {
        _declared[key] = true;
        const script = put(head, 'script[src=$]', key);
        if (!script) throw '';
        // console.log('Injected', script);
      }
      const value = await _loaded.until(() => _scriptPromises[key]);
      // console.log('Loaded', key);
      return await value;
    }
    const scripts = { define, load, _scriptPromises, _loaded, head };
    return scripts;
  })();
  // style injector:

  const dom = (() => {
    /** @typedef {(id: string) => string} StyleTemplate */
    /**
     * @type {{
     * (length: number, styleTemplate:StyleTemplate?) : string;
     * (id: string, styleTemplate:StyleTemplate) : string;
     * (styleTemplate:StyleTemplate) : string;
    * }}
    */
    // @ts-ignore
    const styleId = (first, second)=> {
      let length=0, /**@type {string?}*/id=null, styleTemplate;
      if(second===undefined){
        length = 20, styleTemplate = first;
      } else if(typeof first === 'string'){
        id = first, styleTemplate = second, length=-1;
      } else if(typeof first === 'number'){
        length = first, styleTemplate = second;
      }
      let uid = id || utils.randAZ(length);
      if (styleTemplate) cp.head.append(put('style', styleTemplate(uid)))
      return uid;
    }
    const _styles = {};
    /** @param {string} path */
    function styleLink(path) {
      const url = utils.getUrl(path);
      if (_styles[url]) return;
      if (!url.endsWith('.css')) throw 'only .css can be loaded';
      _styles[url] = true;
      put(head, 'link[href=$][rel=stylesheet]', url);
    }
    const insert = { styleId, styleLink, put };
    return insert;
  })();

  const cp = {
    sleep,
    head,
    scripts,
    utils,
    dom,
    events,
    put,
    html,
  };
  return cp;
})();
