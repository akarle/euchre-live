import React from 'react';
import PropTypes from 'prop-types';
import { ClickableTile, Button, ModalWrapper, TextInput, Checkbox } from 'carbon-components-react';
import {Renew16, Locked16} from '@carbon/icons-react';

export default class TableList extends React.Component {

    conflictHandler = (tableName) => {
        const {playerName} = this.props;
        alert('The "' + tableName + '" table already has a player named ' + playerName 
        + ' -- you must change your name to join this table, or choose another table.');
    }

    handleJoin = (tableName, hasPwd) => {
        console.log('handleJoin, hasPwd=', hasPwd);
        const {playerName} = this.props;
        let joinInfo = {
            table: tableName,
            player_name: playerName
        };
        this.props.joinTable(joinInfo);
    }

    handleCreate = () => {
        const {playerName} = this.props;
        console.log('handleCreate, optHpick:', this.optHpick.value);
        const tableName = this.ctName.value;
        if (!tableName || tableName == ''){
            alert('Unnamed tables are not permitted');
        } else {
            const pwd = this.ctPwd.value;
            let joinInfo = {
                table: tableName,
                player_name: playerName
            }
            if (pwd && pwd != ''){
                joinInfo.password = pwd;
            }
            this.props.joinTable(joinInfo);
        }
    }

    handleRefresh = () => {
        this.refreshButton.blur();
        this.props.refresh();
    }

    renderCards = () => {
        const {tables, playerName} = this.props;
        let retVal = [];
        if (tables){
            tables.forEach(table => {
                const conflict = table.players.indexOf(playerName) > -1 
                    || table.spectators.indexOf(playerName) > -1;
                const conflictWarning = conflict ? 
                  (<div className="table__conflict">A user named &quot;{playerName}&quot; is at this table</div>) : null;
                const clickHandler = conflict ? this.conflictHandler : this.handleJoin;
                let seated = '';
                for (let ni = 0; ni < 4; ni++) {
                    if (table.players[ni] != 'Empty'){
                        if (seated != ''){
                            seated += ', ';
                        }
                        seated += table.players[ni];
                    }
                }
                let specs = '';
                table.spectators.forEach(spName => {
                    if (specs != ''){
                        specs += ', ';
                    }
                    specs += spName;
                })
                const lockIcon = table.has_password ? (<Locked16 fill="red" description="locked table"/>) : null;
                const nameClass = table.has_password ? "table__name table__name--locked" : "table__name";
                retVal.push(
                    <ClickableTile
                        key={table.name}
                        handleClick={() => clickHandler(table.name, table.has_password)}
                        >
                        <div className={nameClass}>{lockIcon}{table.name}</div>
                        {conflictWarning}
                        <div className="table__players">Seated: {seated}</div>
                        <div className="table__spectators">Spectators: {specs}</div>
                    </ClickableTile>
                )
            });
        }
        if (retVal.length == 0) {
            retVal = (
                <div className="tlist__none">
                        No tables yet -- create one or refresh if expecting one...
                </div>
            );
        }
        return retVal;
    }

    render () {
        const {tables} = this.props;
        const showCards = tables.length > 0;
        const cards = this.renderCards();
        return (
            <div className="tlist__outer">
                <div className="tlist__header">
                    <div className="tlist__title__row">
                        <div className="tlist__title">Click a table to join it... or</div>
                        <ModalWrapper
                            className="create__modal"
                            buttonTriggerText="Create a New Table"
                            primaryButtonText="Create"
                            modalHeading="New Table"
                            handleSubmit={this.handleCreate}
                            shouldCloseAfterSubmit={true}
                        >
                            <TextInput
                                id="ct__name"
                                placeholder="name your table"
                                labelText="Table Name"
                                ref={(input) => {this.ctName = input;}}
                            />
                            <br/>
                            <TextInput
                                id="ct__pwd"
                                placeholder="leave blank for no password"
                                labelText="Table Password (optional)"
                                ref={(input) => {this.ctPwd = input;}}
                            />
                            <br/>
                            <fieldset className="ct__optSet">
                                <legend className="ct__optLabel">Game Options</legend>
                                <Checkbox className="opt__hpick" id="opt__hpick" ref={(input) => {this.optHpick = input}}
                                    defaultChecked labelText="Dealer must have suit to pick up"/>
                                <Checkbox className="opt__horder" id="opt__horder" ref={(input) => {this.optHorder = input}}
                                    defaultChecked labelText="Must play alone if ordering partner"/>
                                <Checkbox className="opt__stick" id="opt__stick" ref={(input) => {this.optStick = input}}
                                    labelText="Stick the dealer" />
                            </fieldset>
                        </ModalWrapper>
                    </div>
                    {/* planned: filterByTableName, filterByPlayerName */}
                </div>
                <div className="tlist__main">
                    <div className="tlist__cntl">
                        <Button
                            className="tlist__refresh"
                            hasIconOnly
                            onClick={this.handleRefresh}
                            renderIcon={Renew16}
                            size="small"
                            iconDescription="Refresh List"
                            tooltipPosition="bottom"
                            ref={(button) => {this.refreshButton = button;}}
                        />
                    </div>
                    <div className="tlist__holder">
                        <div className="tlist__list">
                            {cards}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

}
TableList.propTypes = {
    tables: PropTypes.array,
    playerName: PropTypes.string,
    joinTable: PropTypes.func,
    refresh: PropTypes.func
}