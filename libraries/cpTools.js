//@ts-check
/// <reference path="./put.js" />


const cp = (() => {

  const sleep = async (/** @type {number} */ ms) => (
    await new Promise(resolve => setTimeout(resolve, ms))
  );

  const head = document.querySelector('#cpToolsHead') || put(document.head, 'div#cpToolsHead');

  /** @template T
   @param {number?} timeout
   @param {(resolve: (value: T) => void, reject: (reason?: any) => void) => void} f
  */
  const timeoutPromise = (timeout, f) => (
    new Promise((resolve, reject) => {
      f(resolve, reject);
      if (timeout) setTimeout(() => reject('timeout'), timeout);
    }
    ));

  const random = (() => {
    /** random string of letters only */
    const letters = (/** @type {number} */ length) => {
      let out = String.fromCharCode(...crypto.getRandomValues(new Uint8Array(length * 2)));
      // Forbid numbers because style ids can not start with number
      out = btoa(out).replace(/[+/]|\d/g, "");
      if (out.length < length) out += letters(length);
      return out.substring(0, length);
    }
    const random = { letters, }
    return random;
  })();

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
        // return new Promise((resolve, reject) => {
        //   const onLoad = () => {
        //     const out = callable();
        //     if (!out) return;
        //     resolve(out);
        //     this.removeEventListener('', onLoad);
        //   }
        //   this.addEventListener('', onLoad);
        //   if (timeout) setTimeout(() => reject('timeout'), timeout);
        // });
      }
    }
    const events = { EventTrigger };
    return events;
  })();

  const utils = (() => {
    const getUrl = (/** @type {string}*/path) => {
      return new URL(path, document.baseURI).href;
    }
    const utils = { getUrl, sleep };
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

  const insert = (() => {
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
      let uid = id || random.letters(length);
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
    const insert = { styleId, styleLink };
    return insert;
  })();
  const cp = {
    sleep,
    head,
    scripts,
    utils,
    insert,
    events,
    random,
  };
  return cp;
})();



// //@ts-check
// import { assertNonNull, MyDocument, sleep, until } from "./utils.js";
// import {compressor, decompress, distPlugins} from "./build-constants.js";


// const plugins = Object.fromEntries(distPlugins.map(e => [e.key, e]));

// export const scriptLoader = (()=>{

//   let dist = './dist';
//   for (const e of document.querySelectorAll('script')) {
//     const m = e.src.match(/^(.*)\/caph-docs\.(?:min\.)?js$/)
//     if (m) dist = m[1];
//   }
//   //console.log(dist);

//   const div = document.getElementById('core-sources') || MyDocument.createElement('div', {
//     id: 'core-sources',
//     parent: document.head,
//     where: 'beforeend',
//   });


//   const _randomSessionSuffix = ('' + Math.random()).slice(2);
//   const parseKey = (/** @type {string} */ key)=>{
//     // key is like either 'userComponent', './userFileComponent.js', '@caphPlugin', '@dist/caphPlugin', 'full URL'
//     /** @type {string|null} */ 
//     let url = key.replace(/^@dist\/(.*)$/, (_, p)=>`${dist}/${p}`);
//     if(url.startsWith('./')) url += `?${_randomSessionSuffix}`;
//     url = new URL(url, document.baseURI).href;
//     if(!url.endsWith('.js') && !url.endsWith('.css')) url = null;
//     /** @type {string|null} */
//     let proxyKey = null;
//     if(plugins[key]) ({dist:proxyKey} = plugins[key]);
//     return {url, proxyKey};
//   }

//   /**
//    * @param {string} ref 
//    * @param {{
//    * parent?: HTMLElement|null,
//    * where?: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
//    * attrs?: {[key:string]:string},
//    * autoAttrs?: boolean,
//    * isCompressed?: boolean|null,
//    * msTimeout?: number,
//    * }} options
//    */
//   const load = (ref, { attrs={}, parent=null, where='beforeend', autoAttrs=true} = {})=>{
//     let {url:_ref} = parseKey(ref); // especially for plugin loading libraries
//     if(!_ref) return;
//     ref = assertNonNull(_ref);
//     const refBase = ref.split('#')[0].split('?')[0]
//     if (parent == null) parent = div;
//     const ext = refBase.split('.').pop();
//     let tag = ext == 'js' ? 'script' : ext == 'css' ? 'link' : null;
//     if (tag == null) throw new Error('Only .js and .css files can be _sources. Got: ' + ext + ' ' + ref);
//     let /** @type {{[key:string]:string}}*/ defaults = {};
//     if (autoAttrs && tag == 'link') defaults = { rel: 'stylesheet', type: 'text/css' };
//     Object.keys(attrs).forEach(k => defaults[k] = attrs[k]);
//     attrs = defaults;
//     if (tag == 'script') attrs.src = ref;
//     if (tag == 'link') attrs.href = ref;
//     _load_elem(ref, tag, attrs, parent, where);
//   }

//   // const loadFont = async(/** @type {string}*/name)=>{
//   //   return await load(`${dist}/font-${name}.css`);
//   // }
//   // async loadPlugin(name) {
//   //   return await this.load(`${dist}/plugin-${name}.js`);
//   // }

//   const status = {};

//   const _load_elem = (ref, tag, attrs, parent, where) => new Promise((_ok, _err) => {
//     if (status[ref]) return _ok(null); 
//     status[ref] = true;
//     let e = document.createElement(tag);
//     for(let key in attrs) e.setAttribute(key, attrs[key]);
//     let done = false;
//     e.onload = () => { if (!done) { done = true; _ok(null); } };
//     e.onerror = (err) => { if (!done) { done = true; _err(err); } }; // HTTP errors only
//     parent.insertAdjacentElement(where, e);
//   });

//   const injectStyle = (/** @type {string} */ styleStr)=>{
//     MyDocument.createElement('style', { parent: div, where: 'beforeend', text: styleStr });
//   }
//   return {injectStyle, load, div, dist, parseKey};
// })();

// export const parseKey = scriptLoader.parseKey;
// export const injectStyle = scriptLoader.injectStyle;
// export const load = scriptLoader.load;
