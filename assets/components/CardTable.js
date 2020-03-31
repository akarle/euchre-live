import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Button} from 'carbon-components-react';
import {Logout32} from '@carbon/icons-react';

export default class CardTable extends React.Component {

    render () {
        const {name, tableName} = this.props;
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
        return (
            <div id="table">
                <h3>{welcomeMsg}</h3>
                <p>click the leave button to return to the lobby...</p>
                <Button
                    className="leave-button"
                    hasIconOnly
                    onClick={()=>{this.props.chooseTable('')}}
                    renderIcon={Logout32}></Button>
            </div>
        );
    };
}

CardTable.propTypes = {
    chooseTable: PropTypes.func,
    name: PropTypes.string,
    tableName: PropTypes.string
}