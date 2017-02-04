
import {Table, HierarchicalTable, Header, ITable} from './hierarchicaltable/src/index';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {
    observable, computed, action, toJS, runInAction, transaction, asMap, ObservableMap, observe,
    autorun
} from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

import {DataSource, Store} from "./main";

// APP

interface MenuProps {
    table: Table;
    heading: string;
    headers: Header[];
    update: Function;
}

@observer class Menu extends React.Component<MenuProps, {}> {

    select(header:Header) {
        header.selected ? header.deselect() : header.select();
        this.props.update();
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
    update:Function;
}
const TableSelect: React.StatelessComponent<TableSelectProps> = ({table}) => {
    return (<div>
        <div>{
            table.base.heading.map(
                (heading, index) => <span key={index}>
                    <Menu update={this.props.update} heading={heading} headers={table.headings[index]} table={table} />
                </span>)
        }</div>
        <div>{
            table.base.stub.map(
                (stub, index) => <span key={index}>
                    <Menu update={this.props.update} heading={stub} headers={table.stubs[index]} table={table} />
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
        let store = this.props.store;
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

export class App extends React.Component<{store:Store}, {}> {

    update() {
        this.props.store.update_table();
    }

    render() {
        let store = this.props.store;
        return (
            <div>
                <SourceView store={store} />
                <div id="tableselect">
                    {store.active_table ? <TableSelect update={this.update} table={store.active_table} /> : null}
                </div>
                <div id="table">
                    {store.active_table ? <div>{store.active_view ? '' : ''}
                            <HierarchicalTable table={store.active_table} /></div> : null}
                </div>
            </div>
        )
    };
}

