import React from 'react';
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

    componentDidMount () {
        if (this.nameText) {
            this.nameText.focus();
        }
    }

    componentDidUpdate (prevProps) {
        const { name } = this.props;
        if (name && (name != prevProps.name)){
            this.tableText.focus();
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
        const {name, uniqueError} = this.props;
        const {nameIn, nameError, tableIn, tableError} = this.state;
        return (
            <div id="lobby" className="lobby__outer">
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
                        ref={(input) => {this.nameText = input;}}
                    />
                    <Button
                        className="name__button"
                        hasIconOnly={true}
                        onClick={()=>this.props.setName(nameIn)}
                        renderIcon={CheckmarkOutline32}
                        iconDescription="set name"
                        tooltipPosition="bottom"
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
                            ref={(input) => {this.tableText = input;}}
                        />
                        <Button
                            className="table__button"
                            hasIconOnly
                            onClick={()=>this.props.chooseTable(tableIn)}
                            renderIcon={Login32}
                            iconDescription="go!"
                            tooltipPosition="bottom"
                            disabled={tableError || !name || name==''}
                        />
                    </div>
                </div>
                )}
                {uniqueError && (
                <div className="unique__error">
                    <h3>Hmm, a player named {name} is at the table...</h3>
                    <p>You need a unique player name, which you can change in the top input above.</p>
                </div>
                )}
            </div>
        );
    };
}

Lobby.propTypes = {
    setName: PropTypes.func,
    chooseTable: PropTypes.func,
    name: PropTypes.string,
    uniqueError: PropTypes.bool
}