import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'carbon-components-react';

class MainHand extends React.Component {

    cardButtons = (cards) => {
        let buttons = [];
        cards.map((card, index) => {
            const cardSrc = 'cards/' + card + '.svg';
            buttons.push(
            <div key={index+'cw'}
                className="mh__card__wrapper">
                <div
                    key={index}
                    className="mh__card__div">
                    <Link
                        className="mh__card__link"
                        href="#"
                        onClick={(e)=> {
                            e.preventDefault();
                            this.props.cardClick(index)}
                        }>
                        <img className="mh__card" src={cardSrc} />
                    </Link>
                </div>
            </div>
            )
        });
        return buttons;
    }

    render () {
        const { cards } = this.props;
        const cardButtons = this.cardButtons(cards);
        return (
            <div className="mh__card__row">
                {cardButtons}
            </div>
        );
    };
}
MainHand.propTypes = {
    cards: PropTypes.arrayOf(PropTypes.string),
    cardClick: PropTypes.func
}
export default MainHand;