# Component library

Reusable pieces in `assets/account.js` (`SangamAX.ui`) and `assets/account.css`.

| Component | Function / class | Notes |
|---|---|---|
| Field | `fld({id,label,req,hint,err,...})` | Label, hint, input, per-field error tied with `aria-describedby`, `aria-invalid` |
| Password field | `pwfld`, `pwReqs` | Show/hide button, rules list that updates as you type |
| Choice chips | `chips({name,legend,items,radio})` | Real checkboxes/radios in a `<fieldset>`, large hit area |
| Error summary | `errSummary` | `role="alert"`, links to each invalid field, takes focus |
| Note | `note(kind,text)` | info / ok / warn / error with icon + text |
| Loading | `loading(label)` | `aria-busy`, text, no endless spinner without words |
| Error state | `errState(msg,retry)` | Retry button, says what failed |
| Empty state | `empty(title,body,action)` | Honest, with next step |
| Avatar | `avatar(profile)` | Initials or the chosen picture; text contrast 5.68 |
| Badge | `.ax-badge ok|warn|bad|info` | Icon + word + colour |
| Card | `.ax-card2`, `.ax-hero` | White card; dark hero card |
| Stat | `.ax-stat` | A number the server returned, with its label |
| List item | `.ax-item` (`.main`, `.acts`) | Avatar/text left, actions right; wraps on narrow screens |
| Action tile | `.ax-act` | Large link tile with icon |
| Tabs | `AX.tabsFor` | Links with `aria-current="page"`, unread dot |
| Relay | `.ax-relay` | "How a message travels": input pill -> SANGAM -> output pill. Shows saved choices, labelled "not a live connection" |
| Sheet | `AX.openSheet(title, body, okLabel, onOk, danger)` | Native `<dialog>`, focus return, error line |
| Toast | `AX.toast`/`say` | Polite live region |
| Wizard | `.ax-wiz` | Step chips, progress element, Back, Continue, "Save and continue later" |

Add a new component by writing its HTML in one function, styling it under `.ax`, giving it an accessible name, and adding an empty/error state if it loads data.