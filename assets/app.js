import './app.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import Lobby from './components/Lobby';
import CardTable from './components/CardTable';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

// const client = new W3CWebSocket('ws://localhost:3000/play');
let client = null;
// additional fakeClient sockets, only used on tableDebug
let fc1, fc2, fc3 = null;


const tableDebug = false;

class App extends React.Component {

    constructor(props) {
        super(props);
        const initialName = tableDebug ? 'Alex' : '';
        const initialTable = tableDebug ? ('periodic-'+Math.floor(Math.random() * 100)) : '';
        this.state = {
            playerName: initialName,
            tableName: initialTable,
            showTable: tableDebug
        };
        const host = window.location.host;
        const clientAddr = 'ws://' + host + '/play';
        client = new W3CWebSocket(clientAddr);
        if (tableDebug) { 
            // on tableDebug send join plus add 3 fakeClient players that join+sit
            fc1 = new W3CWebSocket(clientAddr);
            fc2 = new W3CWebSocket(clientAddr);
            fc3 = new W3CWebSocket(clientAddr);
            // wait 1 second so sockets establish connection
            setTimeout(()=>{
                this.setFakeGame(initialName, initialTable);
            }, 1000);
        }
        this.pingTimer = setInterval(() => { client.send(JSON.stringify({action:'ping'})) }, 5000);
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

    setFakeGame = (initialName, initialTable) => {
        client.send(JSON.stringify({ action:'join_game', player_name: initialName, game_id: initialTable }));
        fc1.send(JSON.stringify({ action:'join_game', player_name: 'Betty', game_id: initialTable }));
        fc2.send(JSON.stringify({ action:'join_game', player_name: 'CJ', game_id: initialTable }));
        fc3.send(JSON.stringify({ action:'join_game', player_name: 'Dana', game_id: initialTable }));
        fc1.send(JSON.stringify({ action:'take_seat', seat: 0 }));
        fc2.send(JSON.stringify({ action:'take_seat', seat: 1 }));
        fc3.send(JSON.stringify({ action:'take_seat', seat: 2 }));
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