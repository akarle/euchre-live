import React from 'react';
import PropTypes from 'prop-types';
import {Button, TextInput} from 'carbon-components-react';
import {Login32, CheckmarkOutline32} from '@carbon/icons-react';
import TableList from './TableList';

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
            this.nameText.onkeydown = this.checkKey;
        }
    }

    componentDidUpdate (prevProps) {
        const { name } = this.props;
        if (name && (name != prevProps.name)){
            this.setButton.blur();
        }
    }

    checkKey = event => {
        const code = event.keyCode || event.which;
        if (code == 13) {
            const { nameIn } = this.state;
            if (nameIn != ''){
                this.props.setName(nameIn);
                this.nameText.blur();
            }
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
        const {name, uniqueError, tableList} = this.props;
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
                        labelText=""
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
                        ref={(button) => {this.setButton = button;}}
                    />
                </div>
                <br/><br/>
                {name && (
                <div>
                    <h3>Welcome, {name}!</h3>
                    <p>You can change that name if you wish by entering a new one above.</p>
                    <br/><br/>
                    <div>
                        <TableList
                            tables={tableList}
                            playerName={name}
                            joinTable={this.props.joinTable}
                            refresh={this.props.refreshTables}
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
    joinTable: PropTypes.func,
    name: PropTypes.string,
    uniqueError: PropTypes.bool,
    tableList: PropTypes.array,
    refreshTables: PropTypes.func,
    createTable: PropTypes.func
}
