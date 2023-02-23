//@ts-check
/// <reference path="./libraries/putTools.js" />
/// <reference path="./table.js" />


function newUID(length, styleTemplate) {
  const uid = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(length * 2)))).replace(/[+/]/g, "").substring(0, length);
  if (styleTemplate) document.head.append(put('style', styleTemplate(uid)))
  return uid;
}

const toggleClass = (e, className) => {
  const after = !e.classList.contains(className);
  put(e, `${after ? '.' : '!'}${className}`);
  return after;
}

const theTable = (() => {

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

  const hanziSet = {};
  for (let d of THE_KANJI_JSON) {
    hanziSet[d.hanzi] = true;
  }
  const trAll = THE_KANJI_JSON.map(d => {
    let fold = true;
    const button = put(`button.center $`, '+');
    const tdPinyin = put('td.right $', `.${d.pinyin}.`);
    const tdHanzi = put('td.center $', d.hanzi);
    const tdMeaning = put('td.left $', d.meaning);
    listMeaning.push(tdMeaning);
    listHanzi.push(tdHanzi);
    listPinyin.push(tdPinyin);

    const tr = put(`tr#${d.hanzi}`, [put('td', button), tdPinyin, tdHanzi, tdMeaning])
    const urlOf = (s) => `https://en.wiktionary.org/wiki/${encodeURIComponent(s)}`;
    const addLinks = (text) => {
      const out = [];
      let i = 0, j = 0;
      while (j <= text.length) {
        if (j < text.length && hanziSet[text[j]]) {
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
    const trDetailed = put('tr.hidden', put('td.left[colspan=4]', put('ul',
      put('li $', `Character ${d.num}. Grade ${d.grade}. ${d.strokes} stroke${d.strokes != 1 ? 's' : ''}.`),
      put('li', put('a[href=$] $', urlOf(d.pinyin), `Homophones of ${d.pinyin}`)),
      put('li', put('a[href=$] $', urlOf(d.hanzi), `Definition of ${d.hanzi}`)),
      put('li', putNodes`Origin: ${addLinks(d.etymology || '')}`),
    )));
    button.onclick = () => {
      fold = !fold;
      put(trDetailed, fold ? '.hidden' : '!hidden');
      button.innerText = fold ? '+' : '-';
    }
    tdMeaning.onclick = () => toggleClass(tdMeaning, 'off');
    tdHanzi.onclick = () => toggleClass(tdHanzi, 'off');
    tdPinyin.onclick = () => toggleClass(tdPinyin, 'off');
    put(tr, '[grade=$]', d.grade);
    put(trDetailed, '[grade=$]', d.grade);
    return [tr, trDetailed];
  }).flat();

  const tableId = newUID(20, (uid) => `
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
      for (let [e, show] of tgt) put(e, show ? '!hiddenByGrade' : '.hiddenByGrade');
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
  return [fontStyle, more, put('br'), table];
})();

const mainElement = putNodes`
${put('h1 $', 'Chinese Hanzi table')}

The following table contains the 1006 most popular Chinese characters according to Japanese government.
It was taken from Wikipedia's article ${put('a[href=$] $', 'https://en.wikipedia.org/wiki/Ky%C5%8Diku_kanji', 'Kyōiku kanji')}.
It was augmented with chinese pinyin and glyph origins, and tuned for presentation in small screens.

For learning, you may click on the table header to hide the columns, and then click on a word to reveal it.

${theTable}

Carlos Pinzón
`;

document.body.append(
  put(`div.${newUID(20, (uid) => `
    .${uid}{
      padding-top: 1em;
      padding-bottom: calc(20vh + 5rem);
    }
    `)}`,
    put(`div.${newUID(20, (uid) => `
      .${uid}{
        padding: 1% 2% 3% 2%; max-width: 45em; margin: auto;
      }
      `)}`,
      mainElement,
    )
  ));
