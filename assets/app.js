import './app.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import Lobby from './components/Lobby';
import CardTable from './components/CardTable';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

const client = new W3CWebSocket('ws://localhost:3000/play');


const tableDebug = false;

class App extends React.Component {

    constructor(props) {
        super(props);
        const initialName = tableDebug ? 'Alex' : '';
        const initialTable = tableDebug ? 'periodic' : '';
        this.state = {
            playerName: initialName,
            tableName: initialTable,
            showTable: tableDebug
        };
    }

    setPlayerName = name => {
        this.setState(
            { playerName: name }
        );
    }

    chooseTable = tableName => {
        const show = tableName && tableName != '';
        this.setState( {
                tableName: tableName,
                showTable: show
        }, () => {
            client.send(JSON.stringify({
                action:'join_game',
                player_name: this.state.playerName,
                game_id: tableName
            }));
        });
    }

    render () {
        const {showTable, playerName, tableName} = this.state;
        return (
            <div id="top-app">
                {!showTable && (
                    <Lobby
                        setName={this.setPlayerName}
                        chooseTable={this.chooseTable}
                        name={playerName}
                    />
                )}
                {showTable && (
                    <CardTable
                        chooseTable={this.chooseTable}
                        name={playerName}
                        tableName={tableName}
                        active={showTable}
                        client={client}
                    />
                )}
            </div>
        );
    };
}

ReactDOM.render( <App />, document.getElementById('content'));