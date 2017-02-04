
import {Table, HierarchicalTable, Header, ITable} from './hierarchicaltable/src/index';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {MakeMaps} from 'makeMaps';

import {
    observable, computed, action, toJS, runInAction, transaction, asMap, ObservableMap, observe,
    autorun
} from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

// INTERFACES

interface Selection {
    selections: Header[];
    axis: string;
    index: number;
}

// DataTable is a combination of original dataset and its selected headers
class DataTable {

    @observable table: Table;
    @observable view: any; // TODO: asMap type?
    @observable view_matrix: [string[]];
    @observable preview: boolean;
    original: any;

    constructor(table) {

        // TODO: move table building to hierarchical-table library
        this.original = table;

            // let {heading, stub}  = transform_table(table);
            // this.table = get_preview_table(get_table(heading, stub, table));

    }

    @action add_selection(selection: Selection, heading:string, item:string) {
        // TODO: This is completely backwards and belongs to hierarchical-table

        // selection.selections.push(item);
        //
        // let new_headers = [];
        // for (let header of this.table.dataset.levels[heading]) {
        //     if (selection.selections.indexOf(header) !== -1) {
        //         new_headers.push(header);
        //     }
        // }
        // this.table[selection.axis][selection.index] = new_headers;
        // this.table = get_table(this.table.heading.headers, this.table.stub.headers, this.original);
        // for (let hopper of this.table.heading.hop) hopper(true);
        // for (let hopper of this.table.stub.hop) hopper(true);
    }
}

// Collection of DataTables
class DataSource {
    constructor(
        public name:string,
        public url:string,
        public data:Table[]) {}
}


// STORE

class Store {

    name = "store";
    @observable datasources:DataSource[];
    @observable active_source:DataSource;
    @observable active_table:Table;
    // TODO: Fix this Mobx change tracking hack
    @observable active_view:ITable;
    @observable is_loading:boolean;

    constructor(data) {
        this.datasources = data;
    }

    @action activate_source(source:DataSource) {
        this.active_source = source;
        this._load(
            this.active_source.url,
            (data) => {
                this.active_source.data = data.pxdocs.map(doc => new Table(doc));
                observable(this.active_source.data);
            });
    }

    @action activate_table(table:Table) {
        this.active_table = table;
        this.active_table.update_view();
        this.active_view = this.active_table.view;
    }

    @action async _load(url, update):Promise<any> {
        this.is_loading = true;
        try {
            let response = await fetch(url);
            let data = await response.json();
            runInAction("update state after fetching data", () => {
                update(data);
                this.is_loading = false;
            });
        } catch (e) {
            console.log("error", e.message);
            throw e;
        }
    }

    @action update_table(header:Header) {
        header.selected ? header.deselect() : header.select();
        this.active_table.update_view();
        this.active_view = this.active_table.view;
    }

}

// var App = ({store:Store, state_store:StateStore}) =>
// <input onChange={e => store.set_view(e.target.value)} value={store.view} />
// APP

interface MenuProps {
    table: Table;
    heading: string;
    headers: Header[];
}

@observer class Menu extends React.Component<MenuProps, {}> {

    select(header:Header) {
        store.update_table(header);
    }

    render() {
        let {heading, headers} = this.props;
        let menu_items = headers.map(
            (header, index) => {
                return <li
                    onClick={this.select.bind(this, header)}
                    key={heading + "_" + index}
                    className="pure-menu-item">
                    <a href="#" className="pure-menu-link">{header.selected  ? "\u2713" : "\u2717"} {header.name}</a>
                </li>
            });

        return (<div className="header_menu">
            <div className="pure-menu pure-menu-scrollable custom-restricted">
                {store.active_view ? '' : ''}
                <a href="#" className="pure-menu-link pure-menu-heading">{heading}</a>

                <ul className="pure-menu-list">
                    {menu_items}
                </ul>
            </div>
        </div>);
    }
}

interface TableSelectProps {
    table:Table;
}
const TableSelect: React.StatelessComponent<TableSelectProps> = ({table}) => {
    return (<div>
        <div>{
            table.base.heading.map(
                (heading, index) => <span key={index}>
                    <Menu heading={heading} headers={table.headings[index]} table={table} />
                </span>)
        }</div>
        <div>{
            table.base.stub.map(
                (stub, index) => <span key={index}>
                    <Menu heading={stub} headers={table.stubs[index]} table={table} />
                </span>)
        }</div>
    </div>)
};

interface TableListProps {
    source:DataSource;
    activate:Function;
}

const TableList: React.StatelessComponent<TableListProps> = ({source, activate}) => {
    let tables = source.data;
    if (tables.length > 0) {
        let resp = tables.map((data:Table) => {
            return (<li key={data.base.name} onClick={() => activate(data)}>{data.base.name}</li>)
        });
        return <ul>{resp}</ul>;
    } else {
        return null;
    }
};

@observer class SourceView extends React.Component<{store:Store}, {}> {
    render() {
        return <div>
            <h1>Tilastoaineiston katselusovellus</h1>
            <div id="datasources">
                <ul>
                    {store.datasources.map(source => {
                        return (
                            <li key={source.name}>
                                {source.name} <button
                                onClick={() => store.activate_source(source)}>
                                Select source</button>
                            </li>);
                    })}
                </ul>
            </div>
            <div id="tablelist">
                {!store.is_loading && store.active_source ?
                    <TableList source={store.active_source} activate={(table) => store.activate_table(table)} />
                    : store.is_loading ? "..loading" : "no source"}
            </div>
        </div>
    };
}

class App extends React.Component<{store:Store}, {}> {
    render() {
        return (
            <div>
                <SourceView store={store} />
                <div id="tableselect">
                    {store.active_table ? <TableSelect table={store.active_table} /> : null}
                </div>
                <div id="table">
                    {store.active_table ? <div>{store.active_view ? '' : ''}
                            <HierarchicalTable table={store.active_table} /></div> : null}
                </div>
            </div>
        )
    };
}


// INITIALIZATION

const sources = [new DataSource("My data", "http://localhost:8000/", [])];

const store = new Store(sources);

console.log("...");

// const state_store = {
//     datasources: toJS(store.datasources),
//     active_source: null,
//     active_table: null
// };

//
// reaction(
//     () => store.active_source,
//     (active_source) => {
//         state_store.active_source = toJS(active_source);
//         save_state(state_store);
//     });
//
// reaction(
//     () => store.active_table,
//     (active_table) => {
//         state_store.active_table = toJS(active_table);
//         save_state(state_store);
//     });
//
// reaction(
//     () => store.datasources,
//     (datasources) => {
//         state_store.datasources = toJS(datasources);
//         state_store.datasources.data = datasources.data.map(item => toJS(item));
//         save_state(state_store);
//     });

//
// reaction(
//     () => state_store.state,
//     (dry_state) => {
//         store.hydrate(dry_state);
//     }
// );

let data = [{
    id: 1,
    type: 'geojson',
    content: '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.999]},"properties":{"category":"love it"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.998]},"properties":{"category":"fine dining"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.997]},"properties":{"category":"harbor?"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.996]},"properties":{"category":"trees"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.995]},"properties":{"category":"road"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.994]},"properties":{"category":"bugs"}}]}',
    columns: null,
    projection: null,
    latName: null,
    lonName: null,
    name: 'Layer2'
}];

ReactDOM.render(
    <div>
        <App store={store} />
        <DevTools />
    </div>, document.getElementById('app')
);

// State Handling Toolbar


function dry(state:any):any {
    return {
        datasources: toJS(state.datasources),
        active_source: toJS(state.active_source),
        active_table: toJS(state.active_table)};
}

function hydrate():any {
    return null;
}

class StateStore {

    states:{}[] = [];
    active_state:number = 0;


    snapshot_state(state:{}) {
        if (!(this.active_state < this.states.length - 1)) {
            this.states.push(state);
            this.active_state = this.states.length - 1;
        }
    }

    set_state() {
        return this.active_state ? this.states[this.active_state]: '';
    }

    is_prev_state() {
        return this.states.length > 1 && this.active_state > 0;
    }

    is_next_state() {
        return this.states.length > 1 && this.active_state + 1 < this.states.length;
    }

    previous() {
        this.active_state--;
    }

    next() {
        this.active_state++;
    }

    reset() {
        this.states = [];
    }

    save() {
        console.log("supposed to save onto localstorage now...");
    }
}

const statestore = new StateStore();

autorun(() => {
   let unobserved_state = toJS(store.datasources);
   console.log("toJS state", unobserved_state);
   statestore.snapshot_state(unobserved_state);
});

class ToolBar extends React.Component<{statestore:StateStore}, {}> {
    render() {
        return <div>
            <h1 style={{display:"block"}}>State Toolbar</h1>
            <button onClick={statestore.next} disabled={statestore.is_next_state()}>Next state</button>
            <button onClick={statestore.previous} disabled={statestore.is_prev_state()}>Previous state</button>
            <button onClick={statestore.reset}>Reset state</button>
            <button onClick={statestore.save}>Save state</button>
            <span>States: {statestore.states.length}</span>
        </div>
    }
}

let toolbar = document.getElementById('toolbar');
ReactDOM.render(
    <div id="toolbar">
        <ToolBar statestore={statestore} />
    </div>,
    toolbar);

// <App store={store} />
// import * as ReactDOM from 'react-dom';
// import * as React from 'react';
// import { MakeMaps } from 'makeMaps';
// <MakeMaps data={[{
//             id: 1,
//             type: 'geojson',
//             content: '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.999]},"properties":{"category":"love it"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.998]},"properties":{"category":"fine dining"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.997]},"properties":{"category":"harbor?"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.996]},"properties":{"category":"trees"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.995]},"properties":{"category":"road"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.994]},"properties":{"category":"bugs"}}]}',
//             columns: null,
//             projection: null,
//             latName: null,
//             lonName: null,
//             name: 'Layer2'
//         }]}
//           viewOptions={{ showMenu: true, showWelcomeScreen: false, showExportOptions: true, allowLayerChanges: true, language: 'en' }}
//           mapOptions={null} />
// ReactDOM.render(
//     <div>
//         <MakeMaps data={[{
//             id: 1,
//             type: 'geojson',
//             content: '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.999]},"properties":{"category":"love it"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.998]},"properties":{"category":"fine dining"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.997]},"properties":{"category":"harbor?"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.996]},"properties":{"category":"trees"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.995]},"properties":{"category":"road"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.994]},"properties":{"category":"bugs"}}]}',
//             columns: null,
//             projection: null,
//             latName: null,
//             lonName: null,
//             name: 'Layer2'
//         }]}
//             viewOptions={{ showMenu: true, showWelcomeScreen: false, showExportOptions: true, allowLayerChanges: true, language: 'en' }}
//             mapOptions={null} />
//     </div>, document.getElementById('content')
// );
