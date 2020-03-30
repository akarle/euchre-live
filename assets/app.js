import './app.css';
import React from 'react';
import ReactDOM from 'react-dom';
import Lobby from './components/Lobby';

class App extends React.Component {

    render () {
        return (
            <div id="top-app">
                <h3>top level app</h3>
                <Lobby />
            </div>
        );
    };
}

ReactDOM.render( <App />, document.getElementById('content'));