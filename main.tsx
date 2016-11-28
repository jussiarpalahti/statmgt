
import {Table, Dataset, ITable, get_preview_table, transform_table, get_table} from './hierarchicaltable/src/index';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {MakeMaps} from 'makeMaps';

import {observable, computed, action, toJS, runInAction, transaction, asMap, ObservableMap} from 'mobx';
import { observer } from 'mobx-react';

// INTERFACES

// DataTable is a combination of original dataset and its selected headers
class DataTable {

    @observable table: ITable;
    @observable view: any; // TODO: asMap type?
    @observable view_matrix: [string[]];
    @observable preview: boolean;

    constructor(table) {

        // TODO: move table building to hierarchical-table library

        let {heading, stub}  = transform_table(table);
        this.table = get_preview_table(get_table(heading, stub, table));

    }

    @action add_selection(heading:string, index:number) {
        let prev = this.view[heading].indexOf(index);
        if (prev == -1) this.view[heading].push(index);
        else this.view[heading].remove(index);
    }

}

// Collection of DataTables
class DataSource {
    constructor(
        public name:string,
        public url:string,
        public data:DataTable[]) {}
}


// STORES

class StateStore {

    name = 'statestore';
    states:{}[] = [];
    @observable active_state:number = 0;

    @action add_state(state:{}) {
        if (!(this.active_state < this.states.length - 1)) {
            this.states.push(state);
            this.active_state = this.states.length - 1;
        }
    }

    @computed get state() {
        return this.active_state ? this.states[this.active_state]: '';
    }

    is_prev_state() {
        return this.states.length > 1 && this.active_state > 0;
    }

    is_next_state() {
        return this.states.length > 1 && this.active_state + 1 < this.states.length;
    }

    @action previous() {
        this.active_state--;
    }

    @action next() {
        this.active_state++;
    }

}

class Store {

    name = "store";
    @observable datasources:any;
    @observable active_source:DataSource;
    @observable active_table:DataTable;
    @observable is_loading:boolean;

    constructor(data) {
        this.datasources = data;
    }

    hydrate(dry_state:any) {
        // TODO: Make an interface that both Store and dry store could use for data
        this.datasources = dry_state.datasources;
    }

    dehydrate():any {
        // TODO: Make an interface that both Store and dry store could use for data
        return {
            datasources: toJS(this.datasources),
            active_source: toJS(this.active_source),
            active_table: toJS(this.active_table)
        };
    }

    @action activate_source(source:DataSource) {
        this.active_source = source;
        this._load(
            this.active_source.url,
            (data) => this.active_source.data = data.pxdocs.map(doc => new DataTable(doc)));
    }

    @action activate_table(table:DataTable) {
        // TODO: move hopper reset to hierarchical-table library
        for (let hopper of table.table.heading.hop) hopper(true);
        for (let hopper of table.table.stub.hop) hopper(true);
        this.active_table = table;
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

    @action update_table(heading:string, index:number) {
        this.active_table.add_selection(heading, index);
    }

}

// var App = ({store:Store, state_store:StateStore}) =>
// <input onChange={e => store.set_view(e.target.value)} value={store.view} />
// APP

interface MenuProps {
    selection: string[];
    heading: string;
    items: [string]
}

@observer class Menu extends React.Component<MenuProps, {}> {

    select(heading, index) {
        store.update_table(heading, index);
    }

    render() {
        let {selection, heading, items} = this.props;
        let menu_items = items.map(
            (item, index) => {
                let selected = selection.indexOf(item) !== -1;
                return <li
                    onClick={this.select.bind(this, heading, index)}
                    key={heading + "_" + index}
                    className="pure-menu-item">
                    <a href="#" className="pure-menu-link">{selected  ? "\u2713" : "\u2717"} {item}</a>
                </li>
            });

        return (<div className="header_menu">
            <div className="pure-menu pure-menu-scrollable custom-restricted">
                <a href="#" className="pure-menu-link pure-menu-heading">{heading}</a>

                <ul className="pure-menu-list">
                    {menu_items}
                </ul>
            </div>
        </div>);
    }
}

const TableSelect = ({data}) => {
    return (<div>
        <div>{data.table.dataset.heading.map((heading, index) => <span key={index}><Menu selection={data.table.heading.headers[index]} heading={heading} items={data.table.dataset.levels[heading]} /></span>)}</div>
        <div>{data.table.dataset.stub.map((stub, index) => <span key={index}><Menu selection={data.table.stub.headers[index]} heading={stub} items={data.table.dataset.levels[stub]} /></span>)}</div>
    </div>)
};

const TableList = ({source, activate}) => {
    let tables = source.data;
    if (tables.length > 0) {
        let resp = tables.map((data) => {
            return (<li key={data.table.dataset.name} onClick={() => activate(data)}>{data.table.dataset.name}</li>)
        });
        return <ul>{resp}</ul>;
    } else {
        return null;
    }
};

@observer class App extends React.Component<{store:Store}, {}> {
    render() {
        return (
            <div>
                <h1>Example app for hierarchical table library</h1>
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
                <div id="tableselect">
                    {store.active_table ? <TableSelect data={store.active_table} /> : null}
                </div>
                <div id="table">
                    {store.active_table ? <Table data={store.active_table.table} /> : null}
                </div>
            </div>
        )
    };
}


// INITIALIZATION

const sources = [new DataSource("My data", "http://localhost:8000/", [])];

const store = new Store(sources);

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
        <div id="content">

        </div>
    </div>,
    document.getElementById('app'));

// import * as ReactDOM from 'react-dom';
// import * as React from 'react';
// import { MakeMaps } from 'makeMaps';
//<MakeMaps data={[{
// id: 1,
//     type: 'geojson',
//     content: '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.999]},"properties":{"category":"love it"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.998]},"properties":{"category":"fine dining"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.997]},"properties":{"category":"harbor?"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.996]},"properties":{"category":"trees"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.995]},"properties":{"category":"road"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[27.68,62.994]},"properties":{"category":"bugs"}}]}',
//     columns: null,
//     projection: null,
//     latName: null,
//     lonName: null,
//     name: 'Layer2'
// }]}
// viewOptions={{ showMenu: true, showWelcomeScreen: false, showExportOptions: true, allowLayerChanges: true, language: 'en' }}
// mapOptions={null} />
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
