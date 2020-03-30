import React, {Component} from 'react';
import {Button} from 'carbon-components-react';
import {Shuttle32} from '@carbon/icons-react';

export default class Lobby extends React.Component {

    render () {
        return (
            <div id="lobby">
                <h3>Welcome to the Lobby!</h3>
                <p>using a carbon-react button and icon...</p>
                <Button
                    className="shuttle-button"
                    hasIconOnly
                    onClick={()=>{alert('yo!')}}
                    renderIcon={Shuttle32}></Button>
            </div>
        );
    };
}