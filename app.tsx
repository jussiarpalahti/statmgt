
import {Table, HierarchicalTable, Header, Heading} from './hierarchicaltable/src/index';

import * as React from 'react';

import { observer } from 'mobx-react';

import {DataSource, Store} from "./main";

// APP

interface MenuProps {
    table: Table;
    heading: Heading;
    update: Function;
}

@observer class Menu extends React.Component<MenuProps, {}> {

    select(header:Header) {
        header.selected ? header.deselect() : header.select();
        this.props.update();
    }

    render() {
        let {heading} = this.props;
        let menu_items = heading.headers.map(
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
                <a href="#" className="pure-menu-link pure-menu-heading">{heading.name}</a>

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
const TableSelect: React.StatelessComponent<TableSelectProps> = ({table, update}) => {
    return (<div>
        <div>{
            table.headings.map(
                (heading, index) => <span key={index}>
                    <Menu update={update} heading={heading} table={table} />
                </span>)
        }</div>
        <div>{
            table.stubs.map(
                (stub, index) => <span key={index}>
                    <Menu update={update} heading={stub} table={table} />
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

const SourceView: React.StatelessComponent<{store:Store, update:Function, activate:Function}> = ({store, update, activate}) => {
        return <div>
            <h1>Tilastoaineiston katselusovellus</h1>
            <div id="datasources">
                <ul>
                    {store.datasources.map(source => {
                        return (
                            <li key={source.name}>
                                {source.name}
                                <button onClick={() => update(source)}>Select source</button>
                            </li>);
                    })}
                </ul>
            </div>
            <div id="tablelist">
                {!store.is_loading && store.active_source ?
                    <TableList source={store.active_source} activate={(table) => activate(table)} />
                    : store.is_loading ? "..loading" : "no source.."}
            </div>
        </div>
};

export class App extends React.Component<{store:Store}, {}> {

    update_source(source) {
        let prom = this.props.store.activate_source(source);
        prom.then(() => this.forceUpdate());
    }

    activate_table(table) {
        this.props.store.activate_table(table);
        this.forceUpdate();
    }

    update_table() {
        this.props.store.update_table();
        this.forceUpdate();
    }

    render() {
        let store = this.props.store;
        return (
            <div>
                <SourceView store={store} update={this.update_source.bind(this)} activate={this.activate_table.bind(this)} />
                <div id="tableselect">
                    {store.active_table ? <TableSelect update={this.update_table.bind(this)} table={store.active_table} /> : null}
                </div>
                <div id="table">
                    {store.active_table ? <div><HierarchicalTable table={store.active_table} /></div> : null}
                </div>
            </div>
        )
    };
}
