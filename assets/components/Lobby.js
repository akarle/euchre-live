import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Button, TextInput} from 'carbon-components-react';
import {Login32, CheckmarkOutline32} from '@carbon/icons-react';

export default class Lobby extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            nameIn: '',
            nameError: false,
            tableIn: '',
            tableError: false
        }
    }

    handlePlayerIn = event => {
        const value = event.target.value;
        const error = this.checkName(value);
        this.setState({
            nameIn: value,
            nameError: error
        });
    }

    handleTableIn = event => {
        const value = event.target.value;
        const error = this.checkName(value);
        this.setState({
            tableIn: value,
            tableError: error
        });
    }

    checkName = name => {
        //TODO replace w real pattern match
        return name.includes("<");
    }

    render () {
        const {name} = this.props;
        const {nameIn, nameError, tableIn, tableError} = this.state;
        return (
            <div id="lobby">
                <h2>Welcome to the Lobby</h2>
                {!name &&
                <p>First tell us the name that you'll be using for this game...</p>
                }
                <div className="textRow">
                    <TextInput
                        id="lobby__name"
                        className="lobby__name__input"
                        placeholder="Name to display at table"
                        size="xl"
                        invalidText="Sorry, letters A-Z a-z and spaces only"
                        invalid={nameError}
                        onChange={this.handlePlayerIn}
                    />
                    <Button
                        className="name__button"
                        hasIconOnly={true}
                        onClick={()=>this.props.setName(nameIn)}
                        renderIcon={CheckmarkOutline32}
                        iconDescription=""
                        disabled={nameError}
                    />
                </div>
                <br/><br/>
                {name && (
                <div>
                    <h3>Welcome, {name}!</h3>
                    <p>You can change that name if you wish by entering a new one above.</p>
                    <p>Next tell us the name of the table you'd like to join -- use the same table name as the users you would like to play.</p>
                    <div className="textRow">
                        <TextInput
                            id="lobby__table"
                            className="lobby__table__input"
                            size="xl"
                            placeholder="Table choice?"
                            invalidText="Sorry, letters A-Z a-z and spaces only"
                            invalid={tableError}
                            onChange={this.handleTableIn}
                        />
                        <Button
                            className="table__button"
                            hasIconOnly
                            onClick={()=>this.props.chooseTable(tableIn)}
                            renderIcon={Login32}
                            iconDescription=""
                            disabled={tableError || !name || name==''}
                        />
                    </div>
                </div>
                )}
            </div>
        );
    };
}

Lobby.propTypes = {
    setName: PropTypes.func,
    chooseTable: PropTypes.func,
    name: PropTypes.string
}