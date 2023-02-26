//@ts-check
/// <reference path="./libraries/cpTools.js" />

cp.scripts.define(async () => {
  var put = cp.put;

  const readyBasic = new cp.events.Target(false);

  const theTable = (async () => {
    const hanziBasic = (await cp.scripts.cacheLoad('./hanzi.js')).map(
      ([grade, hanzi, pinyin, meaning]) => ({ grade, hanzi, pinyin, meaning })
    );
    readyBasic.dispatch(true);
    const hanziSet = new Set(hanziBasic);

    const details = (async () => {
      await cp.sleep(250); // Just for interactivity
      let table = await cp.scripts.cacheLoad('./hanzi-details.js');
      const dict = {};
      for (let [hanzi, num, grade, strokes, etymology] of table) {
        dict[hanzi] = { num, grade, strokes, etymology };
      }
      return dict;
    })();

    const trAll = hanziBasic.map(d => {
      let fold = true;
      const offToggle = key => (el) => {
        const offKey = `off.${d.hanzi}.${key}`;
        cp.toggle(el, '.off', !cp.ls.get(offKey, true));
        put(el, '@click', () => cp.ls.set(offKey, !cp.toggle(el, 'off')));
      }
      const button = put(`button.center[disabled] $`, '+');
      const tdPinyin = put('td.pinyin $ @', `.${d.pinyin}.`, offToggle('pinyin'));
      const tdHanzi = put('td.hanzi $ @', d.hanzi, offToggle('hanzi'));
      const tdMeaning = put('td.meaning $ @', d.meaning, offToggle('meaning'));
      const tr = put(
        `tr#${d.hanzi}.basic.hiddenByGrade[grade=$]`, d.grade,
        [put('td', button), tdPinyin, tdHanzi, tdMeaning],
      );
      const tdDetails = put('td.left[colspan=4]')
      const trDetails = put('tr.cpHidden.hiddenByGrade[grade=$]', d.grade, tdDetails);
      button.onclick = () => {
        fold = !fold;
        cp.toggle(trDetails, 'cpHidden', fold);
        button.innerText = fold ? '+' : '-';
      }
      details.then(det => {
        put(button, '[!disabled]');
        put(tdDetails, makeDetails({ ...d, ...det[d.hanzi] }));
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
        put('li', put('div $', 'Comments:', (() => {
          const key = `comments.${d.hanzi}`;
          const input = put('textarea.cpBlock $', cp.ls.get(key, ''));
          input.oninput = () => cp.ls.set(key, input['value']);
          return input;
        })(),
          '<', put(
            'button $ @click',
            'Export/Import all comments',
            ()=> openPopUp(),
            ))),
      );
    }

    const openPopUp = async () => {
      const keys = cp.ls.keys().filter(k => k.startsWith('comments.'));
      const simplify = dict => Object.fromEntries(Object.entries(dict).map(([k, v]) => [k.slice(9), v]));
      const dict = simplify(Object.fromEntries(keys.map(k => [k, cp.ls.get(k, '')])));
      const str = JSON.stringify(dict);
      await cp.ui.popUp(close => put('div', [
        put('h2 $', 'Export'),
        put('textarea[readonly="readonly"] $', str),
        put('button $ @click', 'Copy to clipboard', async (b) => {
          put(b, '[disabled]');
          await navigator.clipboard.writeText(str);
          put(b, '[!disabled]');
        }),
        put('button $ @click', 'Close', ()=> close()),
        ...(() => {
          const textarea = put('textarea[placeholder="Paste here to import comments"]');
          const out = [
            put('h2 $', 'Import'),
            textarea,
            put('button $ @click', 'Merge {...this, ...other}', () => {
              const other = JSON.parse(textarea['value']);
              const merged = { ...dict, ...other };
              for (let k in merged) cp.ls.set(`comments.${k}`, merged[k]);
              window.location.reload();
            }),
            put('button $ @click', 'Merge  {...other, ...this}', () => {
              const other = JSON.parse(textarea['value']);
              const merged = { ...other, ...dict };
              for (let k in merged) cp.ls.set(`comments.${k}`, merged[k]);
              window.location.reload();
            }),
            put('button $ @click', 'Overwrite with {...other}', () => {
              const other = JSON.parse(textarea['value']);
              for (let k in { ...dict, other }) cp.ls.set(`comments.${k}`, other[k]);
              window.location.reload();
            }),
            put('button $ @click', 'Close', ()=>close()),
          ];
          return out;
        })(),
      ]));
    }

    // "... @click ...", ()=>{this. ...}

    const tableId = cp.styles.add(uid => `
    #${uid} {
      margin: auto;
    }
    #${uid} thead th.run-animation{
      animation-name: fadeIn;
      animation-duration: 0.1s;
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      20% { opacity: 0; }
      40% { opacity: 0.3; }
      60% { opacity: 0.5; }
      80% { opacity: 0.9; }
      100% { opacity: 1; }
    }
    #${uid} td.center,
    #${uid} th.center {
      text-align: center;
    }
    #${uid} td.pinyin,
    #${uid} th.pinyin {
      text-align: right;
    }
    #${uid} td.hanzi,
    #${uid} th.hanzi {
      text-align: center;
    }
    #${uid} td.meaning,
    #${uid} th.meaning {
      text-align: left;
      max-width:40vw;
    }
    #${uid} td.off {
      opacity: 0;
    }
    #${uid} button {
      min-width: 2em;
      margin-right: 0.5em;
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

    const grades = [-1, 1, 2, 3, 4, 5, 6];

    /** @param {string} key @param {string} name */
    const columnHeader = (key, name) => {
      const th = put(`th.${key} $ @click`, name, (th) => {
        put(th, ".run-animation");
        setTimeout(() => put(th, "!run-animation"), 120);
        const q = `#${tableId} tbody tr:not(.hiddenByGrade) td.${key}`;
        const curr = cp.all(q);
        const setOn = !!cp.sel(`${q}.off`);
        for (let e of curr) cp.toggle(e, 'off', !setOn);
        for (let e of curr) cp.ls.set(`off.${e.parentElement?.id}.${key}`, setOn);
      });
      return th;
    }
    const table = put(`table#${tableId}`, [
      put('thead', put('tr', [
        //put('th $', ''),
        put('th $', ''),
        columnHeader('pinyin', 'Pinyin'),
        columnHeader('hanzi', 'Hanzi'),
        columnHeader('meaning', 'Meaning'),
      ])),
      put('tbody', trAll),
    ]);

    cp.styles.add(`
    button.controls.active {
      text-decoration: underline;
      font-weight: bold;
    }
    button.controls {
      margin-right: 0.1em;
    }`);
    const buttons = grades.map(lvl => {
      const button = put('button.controls');
      put(button, '$', lvl < 0 ? 'All' : lvl);
      button.onclick = () => {
        const q = `#${tableId} tbody tr`;
        let tgtYes, tgtNo;
        if (lvl < 0) {
          tgtYes = cp.all(q);
          tgtNo = [];
        } else {
          const curr = cp.all(`${q}:not(.hiddenByGrade)`);
          tgtYes = cp.all(`${q}[grade="${lvl}"]`);
          tgtNo = cp.utils.arrDiff(curr, tgtYes);
        }
        for (let e of tgtYes) cp.toggle(e, 'hiddenByGrade', false);
        for (let e of tgtNo) cp.toggle(e, 'hiddenByGrade', true);
        for (let b of buttons) cp.toggle(b, 'active', b === button);
        cp.ls.set('controls.grade', lvl);
      }
      return button;
    });
    (async () => {
      await cp.events.untilQuery(`#${tableId}`);
      const theGrade = cp.ls.get('controls.grade', -1);
      const button = buttons[grades.findIndex(lvl => lvl === theGrade) || 0];
      button.click();
    })();
    let fontSize = 1.3;
    let fontStyle = put('style $', `#${tableId} tr.basic { font-size: ${fontSize}em }`);
    const fontButtons = ['-', '+'].map(s => put('button.controls $ @click', s, () => {
      fontSize = fontSize * ((s == '+') ? 1.05 : 0.95);
      fontStyle.innerText = `#${tableId} tr.basic { font-size: ${fontSize}em }`;
    }));
    const more = put('ul', [
      put('li $', 'Grade: ', buttons),
      put('li $', 'Font size: ', fontButtons),
    ])
    return [fontStyle, more, put('br'), put('div[style=$]', 'width:100%', table)];
  })();

  const main = cp.html`
${put('h1 $', 'Chinese table')}

The following table contains the 1006 most popular Chinese characters according to Japanese government.
It was taken from Wikipedia's article ${put('a[href=$] $', 'https://en.wikipedia.org/wiki/Ky%C5%8Diku_kanji', 'Kyōiku kanji')}.
It was augmented with chinese pinyin and glyph origins, and tuned for presentation in small screens.

For learning, you may click on the table header to hide the columns, and then click on a word to reveal it.

${theTable}
${cp.ui.vspace('1em')}
Carlos Pinzón. 2023.
  `;

  const mainWrapper = put(`div.${cp.styles.add((uid) => `
    .${uid}{
      padding-top: 1em;
      padding-bottom: calc(20vh + 5rem);
    }
  `)}`,
    put(`div.${cp.styles.add((uid) => `
    .${uid}{
      padding: 1% 2% 3% 2%; max-width: 45em; margin: auto;
    }
  `)}`,
      main,
    ));

  cp.styles.add(`
    button{cursor: pointer;}
    html{
      font-family: Latin Modern Roman;
      font-size: 1.2em;
    }
  `);
  document.body.append(mainWrapper);

  (async () => {
    await readyBasic.untilTrue();
    cp.styles.add(`
      body {
        background: no-repeat url(./libraries/paper-transparent.png) 0 0;
        background-color: white;
        background-repeat: repeat;
        margin: 0;
      }
    `);
    cp.styles.load('./fonts/font-lmroman.css');
  })();
})
