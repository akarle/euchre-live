import './app.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import Lobby from './components/Lobby';
import CardTable from './components/CardTable';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

// const client = new W3CWebSocket('ws://localhost:3000/play');
let client = null;
let socketAddr, tablesAddr;
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
            showTable: false,
            uniqueError: false,
            firstMsg: null,
            tableList: []
        };
        const host = window.location.host;
        socketAddr = 'ws://' + host + '/play';
        tablesAddr = 'http://' + host + '/tables';
        if (tableDebug) { 
            client = new W3CWebSocket(socketAddr);
            client.onmessage = (event) => this.processResponse(event);
            this.pingTimer = setInterval(() => { this.sendPing(); }, 5000);
            // on tableDebug send join plus add 3 fakeClient players that join+sit
            fc1 = new W3CWebSocket(socketAddr);
            fc2 = new W3CWebSocket(socketAddr);
            fc3 = new W3CWebSocket(socketAddr);
            // wait 1 second so sockets establish connection
            setTimeout(()=>{
                this.setFakeGame(initialName, initialTable);
            }, 1000);
        }
    }

    componentDidMount () {
        this.fetchTables();
    }

    sendPing = () => {
        if (client) {
            client.send(JSON.stringify({action:'ping'}));
        }
    }

    fetchTables = () => {
        fetch (tablesAddr).then ((response) => {
            if (response.ok){
                response.json().then((data) => {
                    console.log(data);
                    this.setState({
                        tableList: data.tables
                    });
                });
            } else {
                console.log('BadResponse:', response);
            }
        }).catch ((error) => {
            console.log('Caught error:', error);
        });
    }

    setPlayerName = name => {
        this.setState({
            playerName: name,
            uniqueError: false
        });
    }

    // need to only showTable if no user-not-unique
    // only process incoming if we're waiting to join table
    // on joinTable success get first 'lobby' phase, put msg on
    //  CardTable.firstMsg prop for table init
    processResponse = event => {
        const {showTable} = this.state;
        if (!showTable){
            let msg = JSON.parse(event.data);
            if (msg) {
                if ('pong' != msg.msg_type){
                    // console.log('App procResp');
                    if (msg.msg_type == 'game_state'){
                        //replace w switch if more than one needed
                        // if (msg.game && msg.game.phase == 'lobby'){
                            //set firstMsg, then set showTable
                            // console.log('App.procResp: set firstMsg & showTable');
                            this.setState({
                                firstMsg: msg
                            }, () => {
                                this.setState({
                                    showTable: true
                                })
                            });
                        // };
                    } else if (msg.msg_type == 'error'){
                        if (msg.msg && msg.msg.includes('Username not unique')){
                            // show confirm-force
                            // console.log('NOT UNIQUE!!');
                            this.setState({
                                uniqueError: true
                            });
                        }
                    }
                }
            }
        }
    }
    
    exitTable = () => {
        client.onmessage = (event) => this.processResponse(event);
        this.setState({
            tableName: '',
            showTable: false,
            firstMsg: null
        }, () => {
            client.send(JSON.stringify({
                action:'leave_table'
            }));
        });
    }

    joinTable = tableInfo => {
        let clientConnectTimeout = 0;
        if (client == null){
            client = new W3CWebSocket(socketAddr);
            client.onmessage = (event) => this.processResponse(event);
            this.pingTimer = setInterval(() => { this.sendPing(); }, 5000);
            clientConnectTimeout = 1000;
        }
        const tableName = tableInfo.table;
        if (!tableName || tableName == ''){
            console.log('Empty table name!!');
        };
        setTimeout(()=>{
            this.setState( {
                    tableName: tableName,
                    showTable: false
            }, () => {
                if (tableName && tableName != ''){
                    tableInfo.action = 'join_table';
                    client.send(JSON.stringify(tableInfo));    
                }
            });
        }, clientConnectTimeout);
    }

    createTable = tableObj => {
        console.log('App.createTable:', tableObj);
    }

    setFakeGame = (initialName, initialTable) => {
        client.send(JSON.stringify({ action:'join_table', player_name: initialName, table: initialTable }));
        fc1.send(JSON.stringify({ action:'join_table', player_name: 'Betty', table: initialTable }));
        fc2.send(JSON.stringify({ action:'join_table', player_name: 'CJ', table: initialTable }));
        fc3.send(JSON.stringify({ action:'join_table', player_name: 'Dana', table: initialTable }));
        fc1.send(JSON.stringify({ action:'take_seat', seat: 0 }));
        fc2.send(JSON.stringify({ action:'take_seat', seat: 1 }));
        fc3.send(JSON.stringify({ action:'take_seat', seat: 2 }));
    }

    render () {
        const {showTable, playerName, tableName, firstMsg, uniqueError, tableList} = this.state;
        return (
            <div id="top-app">
                {!showTable && (
                    <Lobby
                        setName={this.setPlayerName}
                        joinTable={this.joinTable}
                        name={playerName}
                        uniqueError={uniqueError}
                        tableList={tableList}
                        refreshTables={this.fetchTables}
                        createTable={this.createTable}
                    />
                )}
                {showTable && (
                    <CardTable
                        exitTable={this.exitTable}
                        name={playerName}
                        tableName={tableName}
                        firstMsg={firstMsg}
                        client={client}
                    />
                )}
            </div>
        );
    };
}

ReactDOM.render( <App />, document.getElementById('content'));