import './app.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import Lobby from './components/Lobby';
import CardTable from './components/CardTable';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            playerName: '',
            tableName: '',
            showTable: false
        };
    }

    setPlayerName = name => {
        this.setState(
            { playerName: name }
        );
    }

    chooseTable = tableName => {
        const show = tableName && tableName != '';
        this.setState(
            {
                tableName: tableName,
                showTable: show
            }
        );
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
                    />
                )}
            </div>
        );
    };
}

ReactDOM.render( <App />, document.getElementById('content'));