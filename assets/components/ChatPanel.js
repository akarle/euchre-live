import React from 'react';
import PropTypes from 'prop-types';
import { Tile, TextInput, Button } from 'carbon-components-react';
import {SendFilled16} from '@carbon/icons-react';

const MAX_POSTS = 40;

class ChatPanel extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            post: '',
            numPosts: 0,
            postArray: []
        }
    };

    componentDidUpdate (prevProps) {
        const { receivedChat } = this.props;
        const { postArray, numPosts } = this.state;
        let nextArray = postArray;
        if (receivedChat && (receivedChat != prevProps.receivedChat)){
            const nextNum = numPosts + 1;
            const id = 'post-' + nextNum;
            let clsName = 'chat__post';
            let postMsg = receivedChat;
            if (receivedChat.startsWith('<<Error')){
                clsName = 'err__post';
                postMsg = receivedChat.substring(2);
            }
            nextArray.push(
                <p className={clsName}
                    key={nextNum}
                    id={id}>{postMsg}</p>
            );
            if (nextArray.length > MAX_POSTS){
                nextArray = nextArray.slice(1);
            }
            this.setState({
                postArray: nextArray,
                numPosts: nextNum
            }, () => {
                const element = document.getElementById(id);
                if (element) {
                    setTimeout(()=>{
                        element.scrollIntoView();
                    }, 100);
                }
            });
        }
    }

    handleChatIn = event => {
        const val = event.target.value;
        this.setState({ post: val});
    }

    handleSendPost = () => {
        const { post } = this.state;
        if (post && post != ''){
            this.props.sendChat(post);
        }
        this.setState({
            post: ''
        });
        this.chatIn.value = '';
        this.postButton.blur();
    }

    render () {
        const { post, postArray } = this.state;
        return (
            <div className="cp__outer">
            <div className="chat__panel">
                <div className="chat__holder">
                    <div className="chat__tile">
                        {postArray}
                    </div>
                </div>
                <div className="chat__input__row">
                    <TextInput
                        id="chat__in"
                        light
                        className="chat__in__input"
                        placeholder="enter chat posts here"
                        size="sm"
                        onChange={this.handleChatIn}
                        ref={(input) => {this.chatIn = input;}}
                    />
                    <Button
                        className="post__button"
                        size="small"
                        hasIconOnly={true}
                        onClick={this.handleSendPost}
                        renderIcon={SendFilled16}
                        iconDescription="send chat"
                        tooltipPosition="bottom"
                        ref={(button) => {this.postButton = button;}}
                    />
                </div>
            </div>
            </div>
        )
    }

}
ChatPanel.propTypes = {
    receivedChat: PropTypes.string,
    sendChat: PropTypes.func
}
export default ChatPanel;