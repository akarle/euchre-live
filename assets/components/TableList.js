import React from 'react';
import PropTypes from 'prop-types';
import { ClickableTile, Button, ModalWrapper, TextInput, Checkbox, ComposedModal,
     ModalHeader, ModalBody, ModalFooter } from 'carbon-components-react';
import {Renew16, Locked16} from '@carbon/icons-react';

export default class TableList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            pwdOpen: false,
            joinInfo: null
        };
    }

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
        if (!hasPwd) {
            this.props.joinTable(joinInfo);
        } else {
            this.setState({
                joinInfo: joinInfo,
                pwdOpen: true
            })
        }
    }

    handleCreate = () => {
        const {playerName} = this.props;
        console.log('handleCreate, optHpick:', this.optHpick.value);
        const tableName = this.ctName.value;
        if (!tableName || tableName == ''){
            alert('Unnamed tables are not permitted');
        } else {
            const pwd = this.ctPwd.value;
            let settings = {};
            settings.hard_order = this.optHorder.checked;
            settings.hard_pick = this.optHpick.checked;
            settings.stick_dealer = this.optStick.checked;
            let joinInfo = {
                table: tableName,
                player_name: playerName,
                settings: settings
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
    };

    handleModalClose = () => {
        console.log('modal close');
        this.pmPwd.value='';
        this.setState({
            pwdOpen: false
        });
    };

    handleModalSave = () => {
        const {joinInfo} = this.state;
        const pwd = this.pmPwd.value;
        console.log('modal save, pwd=', pwd);
        joinInfo.password = pwd;
        this.props.joinTable(joinInfo);
        this.pmPwd.value='';
        this.setState({
            pwdOpen: false
        });
    };

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
                const settings = table.settings;
                let optionSpan = '';
                if (settings.hard_pick || settings.hard_order || settings.stick_dealer){
                    const thp = settings.hard_pick ? 'HardPick' : '';
                    const tho = settings.hard_order ? 'HardOrder' : '';
                    const tsd = settings.stick_dealer ? 'StickDealer' : '';
                    optionSpan = (<span className="table__options">&nbsp;&nbsp;&nbsp;{thp} {tho} {tsd}</span>);
                }
                retVal.push(
                    <ClickableTile
                        key={table.name}
                        handleClick={() => clickHandler(table.name, table.has_password)}
                        >
                        <div className={nameClass}>{lockIcon}{table.name}{optionSpan}</div>
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

    renderPasswordModal = () => {
        const {pwdOpen} = this.state;
        return (
            <ComposedModal
                className="pm"
                open={pwdOpen}
                onClose={this.handleModalClose}>
                <ModalHeader
                    className="pm__head"
                    title="Enter Table Password"
                    iconDescription="close"
                    // closeModal={this.handleModalClose}
                    />
                <ModalBody
                    className="pm__body"
                >
                    <TextInput
                        id="pm__pwd"
                        placeholder="enter table password"
                        labelText="Password"
                        ref={(input) => {this.pmPwd = input;}}
                    />
                </ModalBody>
                <ModalFooter
                    className="pm_foot"
                    primaryButtonText="Save"
                    // closeModal={this.handleModalClose}
                    onRequestSubmit={this.handleModalSave}
                />
            </ComposedModal>
        );
    }

    render () {
        const {tables} = this.props;
        const showCards = tables.length > 0;
        const cards = this.renderCards();
        const passwordModal = this.renderPasswordModal(); 
        return (
            <div className="tlist__outer">
                {passwordModal}
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
                                    defaultChecked labelText="HardPick: Dealer must have suit to pick up"/>
                                <Checkbox className="opt__horder" id="opt__horder" ref={(input) => {this.optHorder = input}}
                                    defaultChecked labelText="HardOrder: Must play alone if ordering partner"/>
                                <Checkbox className="opt__stick" id="opt__stick" ref={(input) => {this.optStick = input}}
                                    labelText="StickDealer: Dealer must name trump if no one has" />
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