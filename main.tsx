
import {App} from "./app";

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

// Collection of Tables
export class DataSource {
    constructor(
        public name:string,
        public url:string,
        public data:Table[]) {}
}

// STORE

export class Store {

    name = "store";
    @observable datasources:DataSource[];
    @observable active_source:DataSource;
    active_table:Table;
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
            });
    }

    @action activate_table(table:Table) {
        this.active_table = table;
        this.active_table.update_view();
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

    @action update_table() {
         // TODO: Get Matrix URL from table and fetch its data
        this.active_table.update_view();
    }

}

// INITIALIZATION

const sources = [new DataSource("My data", "http://localhost:8000/", [])];

const store = new Store(sources);

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
        // datasources' table objects stringify
        // should probably get all Header objects to JSON
        // or toJS might already do this and below works...
        active_table: toJS(state.active_table)
        };
}

function hydrate():any {
    return null;
}

class StateStore {

    states:{}[] = [];
    active_state:number = 0;

    snapshot_state(state:{}) {
        if (!(this.active_state < this.states.length - 1)) {
            this.states.push(dry(state));
            this.active_state = this.states.length - 1;
        }
    }

    set_state() {
        // TODO: Apply state to store
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
