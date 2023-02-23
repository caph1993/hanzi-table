//@ts-check
/// <reference path="./libraries/putTools.js" />
/// <reference path="./table.js" />


const toggleClass = (e, className)=>{
  const after = !e.classList.contains(className);
  put(e, `${after?'.':'!'}${className}`);
  return after;
}

const theTable = (() => {

  const listMeaning = [];
  const listHanzi = [];
  const listPinyin = [];
  const addClickToggle = (td, list)=>{
    td.onclick = ()=>{
      let isOff = true;
      for(let e of list) isOff = isOff && e.classList.contains('off');
      const setOff = !isOff;
      for(let e of list) put(e, setOff?'.off':'!off');
    }
    return td;
  }  

  const table = put(`table#${newUID(20, (uid) => `
  #${uid} td {
    text-align: center;
  }
  #${uid} td.details {
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
  #${uid} .origin{
    text-align: left;
    max-width: 25vw;
  }
  #${uid} .origin.fold{
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  `)}`, [
    put('thead', put('tr', [
      //put('th $', ''),
      put('th $', ''),
      addClickToggle(put('th $', 'Pinyin'), listPinyin),
      addClickToggle(put('th $', 'Hanzi'), listHanzi),
      addClickToggle(put('th $', 'Meaning'), listMeaning),
    ])),
    put('tbody', THE_KANJI_JSON.map(d => {
      let fold = true;
      const button = put(`button $`, '+');
      const tdPinyin = put('td $', `.${d.pinyin}.`);
      const tdHanzi = put('td $', d.hanzi);
      const tdMeaning = put('td $', d.meaning);
      listMeaning.push(tdMeaning);
      listHanzi.push(tdHanzi);
      listPinyin.push(tdPinyin);

      const tr = put('tr', [put('td', button), tdPinyin, tdHanzi, tdMeaning])
      const urlOf = (s) => `https://en.wiktionary.org/wiki/${encodeURIComponent(s)}`;
      const trDetailed = put('tr.hidden', put('td.details[colspan=4]', put('ul',
        put('li $', `#${d.num}. Grade ${d.grade}. ${d.strokes} stroke${d.strokes != 1 ? 's' : ''}.`),
        put('li', put('a[href=$] $', urlOf(d.pinyin), `Homophones of ${d.pinyin}`)),
        put('li', put('a[href=$] $', urlOf(d.hanzi), `Definition of ${d.hanzi}`)),
        put('li $', `Origin: ${d.etymology}`),
      )));
      button.onclick = () => {
        fold = !fold;
        put(trDetailed, fold ? '.hidden' : '!hidden');
        button.innerText = fold ? '+' : '-';
      }
      tdMeaning.onclick = ()=>toggleClass(tdMeaning, 'off');
      tdHanzi.onclick = ()=>toggleClass(tdHanzi, 'off');
      tdPinyin.onclick = ()=>toggleClass(tdPinyin, 'off');
      return [tr, trDetailed];
    }).flat()),
  ]);

  return table;
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

function newUID(length, styleTemplate) {
  const uid = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(length * 2)))).replace(/[+/]/g, "").substring(0, length);
  if (styleTemplate) document.body.append(put('style', styleTemplate(uid)))
  return uid;
}

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
