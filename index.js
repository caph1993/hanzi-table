//@ts-check
/// <reference path="./libraries/cpTools.js" />
var put = cp.put;

const toggleClass = (e, className) => {
  const after = !e.classList.contains(className);
  put(e, `${after ? '.' : '!'}${className}`);
  return after;
}


cp.dom.style(`
body {
  background: no-repeat url(./libraries/paper-transparent.png) 0 0;
  background-color: white;
  background-repeat: repeat;
  margin: 0;
}
button{cursor: pointer;}
html{font-family: Latin Modern Roman;}
`)

const theTable = (async () => {

  const listMeaning = [];
  const listHanzi = [];
  const listPinyin = [];
  const addClickToggle = (td, list) => {
    td.onclick = () => {
      let isOff = true;
      for (let e of list) isOff = isOff && e.classList.contains('off');
      const setOff = !isOff;
      for (let e of list) put(e, setOff ? '.off' : '!off');
    }
    return td;
  }
  const grades = [-1, 1, 2, 3, 4, 5, 6];

  const hanziBasic = (await cp.scripts.load('./hanzi.js')).map(
    ([hanzi, pinyin, meaning])=>({hanzi, pinyin, meaning})
  );
  const hanziSet = new Set(hanziBasic);

  const details = cp.sleep(800)
  .then(()=>cp.scripts.load('./hanzi-details.js')
  .then(table=>{
    const dict = {};
    for(let [hanzi, num, grade, strokes, etymology] of table){
      dict[hanzi] = { num, grade, strokes, etymology};
    }
    return dict;
  }));

  const trAll = hanziBasic.map(d => {
    let fold = true;
    const button = put(`button.center[disabled] $`, '+');
    const tdPinyin = put('td.right $', `.${d.pinyin}.`);
    const tdHanzi = put('td.center $', d.hanzi);
    const tdMeaning = put('td.left[style=$] $','max-width:40vw', d.meaning);
    const tr = put(
      `tr#${d.hanzi}`,
      [put('td', button), tdPinyin, tdHanzi, tdMeaning],
    );
    const tdDetails = put('td.left[colspan=4]')
    const trDetails = put('tr.hidden', tdDetails);
    listMeaning.push(tdMeaning);
    listHanzi.push(tdHanzi);
    listPinyin.push(tdPinyin);
    button.onclick = () => {
      fold = !fold;
      put(trDetails, fold ? '.hidden' : '!hidden');
      button.innerText = fold ? '+' : '-';
    }
    tdMeaning.onclick = () => toggleClass(tdMeaning, 'off');
    tdHanzi.onclick = () => toggleClass(tdHanzi, 'off');
    tdPinyin.onclick = () => toggleClass(tdPinyin, 'off');
    details.then(det=>{
      const {grade} = det[d.hanzi];
      put(button, '[!disabled]');
      put(tdDetails, makeDetails({...d, ...det[d.hanzi]}));
      put(tr, '[grade=$]', grade);
      put(trDetails, '[grade=$]', grade);
    })
    return [tr, trDetails];
  }).flat();

  const makeDetails = (d) => {
    const wiktionary = (s) => (
     `https://en.wiktionary.org/wiki/${encodeURIComponent(s)}`
    );
    const addLinks = (/** @type {string} */ text) => {
      // replace hanzi characters in text with links 
      const out = [];
      let i = 0, j = 0;
      while (j <= text.length) {
        if (j < text.length && hanziSet.has(text[j])) {
          out.push(text.slice(i, j));
          out.push(put('a[href=$] $', `#${text[j]}`, text[j]));
          i = j + 1;
        } else if (j == text.length) {
          out.push(text.slice(i, j));
          i = j;
        }
        j++;
      }
      return out;
    }
    return put('ul',
      put('li $', `Character ${d.num}. Grade ${d.grade}. ${d.strokes} stroke${d.strokes != 1 ? 's' : ''}.`),
      put('li', put('a[href=$] $', wiktionary(d.pinyin), `Homophones of ${d.pinyin}`)),
      put('li', put('a[href=$] $', wiktionary(d.hanzi), `Definition of ${d.hanzi}`)),
      put('li', cp.html`Origin: ${addLinks(d.etymology || '')}`),
    );
  }

  const tableId = cp.dom.styleId(uid => `
  #${uid} {
    margin: auto;
  }
  #${uid} td.center,
  #${uid} th.center {
    text-align: center;
  }
  #${uid} td.right,
  #${uid} th.right {
    text-align: right;
  }
  #${uid} td.left,
  #${uid} th.left {
    text-align: left;
  }
  #${uid} td.off {
    opacity: 0;
  }
  #${uid} button {
    min-width: 2em;
    margin-right: 0.5em;
  }
  #${uid} .hidden{
    display:none;
  }
  #${uid} .hiddenByGrade{
    display:none;
  }
  #${uid} .origin{
    text-align: left;
    max-width: 25vw;
  }
  #${uid} .origin.fold{
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  `);

  const table = put(`table#${tableId}`, [
    put('thead', put('tr', [
      //put('th $', ''),
      put('th $', ''),
      addClickToggle(put('th.right $', 'Pinyin'), listPinyin),
      addClickToggle(put('th.center $', 'Hanzi'), listHanzi),
      addClickToggle(put('th.left $', 'Meaning'), listMeaning),
    ])),
    put('tbody', trAll),
  ]);

  document.head.appendChild(put('style $', `
  button.controls.active {
    text-decoration: underline;
    font-weight: bold;
  }
  button.controls {
    margin-right: 0.1em;
  }
  `));
  const buttons = grades.map(lvl => {
    const button = put('button.controls $', lvl < 0 ? 'All' : lvl);
    if (lvl < 0) put(button, '.active');
    button.onclick = () => {
      const tgt = trAll.map(e => [e, lvl < 0 || e.getAttribute('grade') == '' + lvl]);
      for (let [e, show] of tgt){
        put(e, show ? '!hiddenByGrade' : '.hiddenByGrade');
      }
      for (let b of buttons) {
        put(b, b === button ? '.active' : '!.active');
      }
    }
    return button;
  });

  let fontSize = 1.4;
  let fontStyle = put('style $', `#${tableId} { font-size: ${fontSize}em }`);
  const fontButtons = ['-', '+'].map(s => {
    const button = put('button.controls $', s);
    button.onclick = () => {
      fontSize = fontSize * ((s == '+') ? 1.05 : 0.95);
      fontStyle.innerText = `#${tableId} { font-size: ${fontSize}em }`;
    }
    return button;
  });
  const more = put('ul', [
    put('li $', 'Grade: ', buttons),
    put('li $', 'Font size: ', fontButtons),
  ])
  return [fontStyle, more, put('br'), put('div[style=$]', 'width:100%', table)];
})();

const mainElement = cp.html`
${put('h1 $', 'Chinese Hanzi table')}

The following table contains the 1006 most popular Chinese characters according to Japanese government.
It was taken from Wikipedia's article ${put('a[href=$] $', 'https://en.wikipedia.org/wiki/Ky%C5%8Diku_kanji', 'Kyōiku kanji')}.
It was augmented with chinese pinyin and glyph origins, and tuned for presentation in small screens.

For learning, you may click on the table header to hide the columns, and then click on a word to reveal it.

${theTable}

Carlos Pinzón
`;

document.body.append(
  put(`div.${cp.dom.styleId((uid) => `
    .${uid}{
      padding-top: 1em;
      padding-bottom: calc(20vh + 5rem);
    }
    `)}`,
    put(`div.${cp.dom.styleId((uid) => `
      .${uid}{
        padding: 1% 2% 3% 2%; max-width: 45em; margin: auto;
      }
      `)}`,
      mainElement,
    )
  ));
