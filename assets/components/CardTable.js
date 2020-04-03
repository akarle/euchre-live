import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Button, Grid, Row, Column} from 'carbon-components-react';
import {Logout32} from '@carbon/icons-react';

export default class CardTable extends React.Component {

    render () {
        const {name, tableName} = this.props;
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
        return (
            <div id="table">
                <Grid>
                    <Row className="table__header">
                        <Column className="hd__left" sm={3}>
                            <h3>{welcomeMsg}</h3>
                        </Column>
                        <Column className="hd__right" sm={1}>
                            Exit 
                            <Button
                                className="leave-button"
                                hasIconOnly
                                onClick={()=>{this.props.chooseTable('')}}
                                renderIcon={Logout32}></Button>
                        </Column>
                    </Row>
                    <Row className="table__top">
                        <Column className="tt__left" sm={1}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tt__center" sm={2}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tt__right" sm={1}>
                            <div>yo!</div>
                        </Column>
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" sm={1}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tm__center" sm={2}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tm__right" sm={1}>
                            <div>yo!</div>
                        </Column>
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" sm={1}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tb__center" sm={2}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tb__right" sm={1}>
                            <div>yo!</div>
                        </Column>
                    </Row>
                </Grid>
                
                
            </div>
        );
    };
}

CardTable.propTypes = {
    chooseTable: PropTypes.func,
    name: PropTypes.string,
    tableName: PropTypes.string
}