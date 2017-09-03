import React, { Component } from 'react';
import { AppRegistry, Alert, AsyncStorage, View, BackAndroid, ToastAndroid, Image } from 'react-native';
import { Container, Header, Title, Content, Footer, FooterTab, Button, Left, Right, Body, Icon, Text, Toast, Item, Label, Form, Input, Root, List, ListItem, Thumbnail, Grid, Col, Card, CardItem } from 'native-base';

import PubNub from 'pubnub';
import moment from 'moment-timezone';
import DeviceInfo from 'react-native-device-info';
// import { getTagId, readTag, writeTag } from 'nfc-ndef-react-native';

let pubnub;

console.disableYellowBox = true;

class TuiBedsNfc extends Component {


    constructor(props) {
        super(props);
        this.state = { //defaults
            subscribeKey: "sub-c-99728d5c-8be0-11e7-8512-8a1cdbfa3414",
            publishKey: "pub-c-fcc551f8-e994-47f4-b604-22922ec783a4",
            channelId: "team1",
            sensorId: "Room1",
            tagValue: "",
            status: "Loading",
            pubnubStatus: "loading",
            history: [],
            view: 'scanner'
        };


        AsyncStorage.getItem('state').then((myState) => {
            console.log("Saved state: ", myState);
            if (myState != null) {
                this.setState(JSON.parse(myState));
                this.setState({ 'status': "Config loaded" });
            } else {
                this.setState({ 'status': "Base config loaded" });
            }
        });
    }
    componentWillMount() {
        console.log("Will mount");
        this.initialisePubNub();
    };

    saveConfigAndReinitialise() {
        console.log(this.state);
        // console.log(AsyncStorage);
        // console.log(AsyncStorage.setState);
        this.setState({ 'status': "saved" });
        var persistedState = {
            subscribeKey: this.state.subscribeKey,
            publishKey: this.state.publishKey,
            channelId: this.state.channelId,
            sensorId: this.state.sensorId
        };
        AsyncStorage.setItem('state', JSON.stringify(persistedState));
        // Alert.alert("Lifecycle", "Save state");
        this.initialisePubNub();
    }
    resetConfig() {
        AsyncStorage.removeItem('state');
        Alert.alert("Config Reset", "Please restart application");
        this.setState({ 'status': "Config Reset - Please restart application" });
    }



    initialisePubNub() {
        console.log("initialisePubNub");
        // console.log(this.state.subscribeKey);
        // console.log(pubnub);
        this.setState({ 'status': "Config loaded" });

        if (pubnub != undefined) {
            console.log('clearing pubnub');
            pubnub.unsubscribeAll();
            pubnub.stop();
        }
        let uid = DeviceInfo.getUniqueID();
        let dname = DeviceInfo.getDeviceName();
        let uuid = dname + '_' + uid; //Unknown_9e4dfd21f2eb81d1
        console.log('uuid', uuid);
        pubnub = new PubNub({
            subscribeKey: this.state.subscribeKey,
            publishKey: this.state.publishKey,
            ssl: true,
            presenceTimeout: 30,
            heartbeatInterval: 1,
            keepAlive: true,
            restore: true,
            keepAliveSettings: {
                keepAliveMsecs: 1000,
                freeSocketKeepAliveTimeout: 1000,
                timeout: 1000
            },
            uuid: uuid
        })

        let classThis = this;

        pubnub.addListener({
            message: function (message) {
                // console.log(message);
                // console.log(message.message);
                let text = message.message;
                // console.log(classThis.setState)
                //text.time = new Date(message.timetoken)).toGMTString();
                console.log('Message received');

                console.log(message);
                console.log(message.timetoken);

                console.log('Time format');
                text.date = new Date(message.timetoken / 1e4).toGMTString();


                let d = new Date(message.timetoken / 1e4);
                // console.log('d', d);
                // console.log(moment);
                let m = moment(d);
                // console.log('m', m);
                let t = m.tz("Europe/London");
                // console.log('t', t);
                let f = t.format('h:mm a');
                // console.log('f', f);


                text.time = f;
                console.log(text);
                ToastAndroid.show(text.tag + ' -> ' + text.sensor, ToastAndroid.SHORT);
                // Toast.show({ text: text.tag + ' -> ' + text.sensor, duration: 1000, position: 'top' });

                // console.log('getFirstImageURL', getFirstImageURL);
                // //has already been downloaded
                // getFirstImageURL(text.tag).then(function (v) {
                //   console.log('Image for: ' + text.tag);
                //   console.log(v);
                // });

                // var newHistory = [text].concat(classThis.state.history);
                var newHistory = [text, ...classThis.state.history];
                classThis.setState({ history: newHistory, pubnubStatus: "connected" });
                // classThis.setState({ status: "Tag received" });
            },
            status: function (s) {
                // let category = s.category; // PNConnectedCategory
                // let operation = s.operation; // PNSubscribeOperation
                console.log("PubNub Status Event Listener", s);
                if (s.error == true) {
                    console.log("PubNub Error - true");
                    classThis.setState({ 'pubnubStatus': "error" });
                } else {
                    console.log("PubNub Error - false");
                    classThis.setState({ 'pubnubStatus': "connected" });
                }
            }
        });
        console.log('subscribe - starting');
        pubnub.subscribe({
            channels: [this.state.channelId]
        });


        this.setState({ 'status': "PubNub: Connected" });

    }


    _handleSubscribeKeyChange = (key) => {
        this.setState({ subscribeKey: key });
        this.setState({ status: "Updating subscribeKey" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handlePublishKeyChange = (key) => {
        this.setState({ publishKey: key });
        this.setState({ status: "Updating publishKey" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handleChannelIdChange = (id) => {
        this.setState({ channelId: id });
        this.setState({ status: "Updating channelId" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handleSensorIdChange = (id) => {
        this.setState({ sensorId: id });
        this.setState({ status: "Updating sensorId" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handleTagValueChange = (text) => {
        this.setState({ tagValue: text });
        this.setState({ status: "Updated tag value" });
    };
    _focusNextField(nextField) {
        this.refs[nextField].focus()
    }

    sendTestTag = () => {
        console.log('generate test tag')
        let names = ["Tyrion Lannister", "Cersei Lannister", "Daenerys Targaryen", "Jon Snow", "Sansa Stark", "Arya Stark", "Jorah Mormont", "Jaime Lannister", "Samwell Tarly", "Theon Greyjoy"];
        //let newTag = "" + Math.floor(100000000 + Math.random() * 900000000)
        let newTag = names[Math.floor(Math.random() * names.length)];

        console.log(newTag);
        //TODO setstate not working here
        console.log(this.setState);
        console.log(this.state);
        this.setState({ tagValue: newTag });

        console.log(this.publish);
        setTimeout(() => this.publish(), 0);

    }
    publish = () => {
        console.log('publishing tag')
        let classThis = this;

        pubnub.publish({
            channel: this.state.channelId,
            message: { "sensor": this.state.sensorId, "tag": this.state.tagValue }
        }, function (status, response) {
            console.log(status, response);
            if (status.error) {
                Alert.alert(
                    'Error!',
                    'Message Not Sent',
                );
            } else {
                classThis.setState({ status: "Tag sent" });
            }
        });
    }


    renderView() {
        switch (this.state.view) {
            case 'scanner':
                console.log('View: scanner');
                return (
                    <Content padder>

                        <Image source={require('./img/nfc-icon.png')}
                            style={{ height: 380, width: null, flex: 1 }} />

                        <Card>
                            <CardItem>
                                <Left>
                                    <Icon name='alert' />
                                    <Body>
                                        <Text>Scan your tags</Text>
                                    </Body>
                                </Left>
                            </CardItem>
                        </Card>

                    </Content>);
                break;
            case 'history':
                console.log('View: history');
                return (
                    <View>
                        <List dataArray={this.state.history}
                            renderRow={(item) =>
                                <ListItem avatar>
                                    <Left>
                                        {/*<Thumbnail source={{ uri: 'https://robohash.org/' + item.tag }} />*/}
                                        <Thumbnail source={{ uri: 'https://first-image-service-npttfcvrns.now.sh/' + item.tag }} />
                                    </Left>
                                    <Body>
                                        <Text>{item.tag}</Text>
                                        <Text note>Checked in at: {item.sensor}</Text>
                                    </Body>
                                    <Right>
                                        <Text note>{item.time}</Text>
                                    </Right>
                                </ListItem>
                            } />

                        {this.state.history.length == 0 &&
                            <Content padder>
                                <Card>
                                    <CardItem>
                                        <Left>
                                            <Icon name='alert' />
                                            <Body>
                                                <Text>No messages received yet</Text>
                                            </Body>
                                        </Left>
                                    </CardItem>
                                </Card>
                            </Content>
                        }


                    </View>);
                break;
            case 'config':
                console.log('View: config');
                return (
                    <Content padder>

                        <Card>
                            <CardItem>
                                <Left>
                                    <Icon name='alert' />
                                    <Body>
                                        <Text>Scan NFC tags after setting config below</Text>
                                    </Body>
                                </Left>
                            </CardItem>
                        </Card>

                        <Form>
                            <Item stackedLabel>
                                <Label>Subscribe Key</Label>
                                <Input
                                    value={this.state.subscribeKey}
                                    onChangeText={this._handleSubscribeKeyChange}
                                    />
                            </Item>
                            <Item stackedLabel>
                                <Label>Publish Key</Label>
                                <Input
                                    value={this.state.publishKey}
                                    onChangeText={this._handlePublishKeyChange}
                                    />
                            </Item>

                            <Item stackedLabel>
                                <Label>Channel Id</Label>
                                <Input
                                    value={this.state.channelId}
                                    onChangeText={this._handleChannelIdChange}
                                    />
                            </Item>
                            <Item stackedLabel>
                                <Label>Sensor Id</Label>
                                <Input
                                    value={this.state.sensorId}
                                    onChangeText={this._handleSensorIdChange}
                                    />
                            </Item>
                        </Form>

                        <Button block
                            onPress={this.resetConfig}>
                            <Text>
                                Reset Config
              </Text>
                        </Button>
                    </Content>);
                break;
            case 'test':
                console.log('View: test');
                return (
                    <Content>
                        <Content padder>


                            <Card>
                                <CardItem>
                                    <Left>
                                        <Icon name='alert' />
                                        <Body>
                                            <Text>Fake an NFC tag scan, add any name</Text>
                                        </Body>
                                    </Left>
                                </CardItem>
                            </Card>

                            <Item stackedLabel>
                                <Label>Tag Value</Label>
                                <Input
                                    placeholder='Add name of tag here'
                                    value={this.state.tagValue}
                                    onChangeText={this._handleTagValueChange}
                                    />
                            </Item>
                        </Content>
                        <Grid>
                            <Col>
                                <Content padder>
                                    <Button block
                                        onPress={this.publish}>
                                        <Text>
                                            Send Custom Tag
                      </Text>
                                    </Button>
                                </Content>
                            </Col>
                            <Col>
                                <Content padder>
                                    <Button block
                                        onPress={this.sendTestTag}>
                                        <Text>
                                            Send Generated Tag
                  </Text>
                                    </Button>
                                </Content>
                            </Col>
                        </Grid>



                    </Content>);
                break;
        }
    }

    renderPubnubStatus() {
        switch (this.state.pubnubStatus) {
            case 'connected':
                return (
                    <Icon name='checkmark-circle' />
                )
                break;
            case 'error':
                return (
                    <Icon name='warning' style={{ color: 'red' }} />
                )
                break;
            default: // loading
                return (
                    <Icon name='sync' />
                )
        }
    }

    focusTextInput(node) {
        try {
            TextInputState.focusTextInput(findNodeHandle(node))
        } catch (e) {
            console.log("Couldn't focus text input: ", e.message)
        }
    }

    render() {
        return (
            <Container>
                <Header>
                    <Left>
                        <Button transparent
                            onPress={() => BackAndroid.exitApp()}>
                            <Icon name='power' />
                        </Button>
                    </Left>
                    <Body>
                        <Title>
                            TUI Beds NFC
            </Title>
                    </Body>
                    <Right>
                        <Button transparent
                            onPress={() => this.setState({ view: 'config' })}>
                            {this.renderPubnubStatus()}
                        </Button>
                    </Right>
                </Header>

                <Content>

                    {this.renderView()}

                    <Text>
                        {/*JSON.stringify(this.state)*/}
                    </Text>

                </Content>

                <Footer>
                    <FooterTab>
                        <Button vertical
                            active={this.state.view === 'scanner'}
                            onPress={() => this.setState({ view: 'scanner' })}>
                            <Icon name="wifi" />
                            <Text>Scanner</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'history'}
                            onPress={() => this.setState({ view: 'history' })}>
                            <Icon name="chatboxes" />
                            <Text>History</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'config'}
                            onPress={() => this.setState({ view: 'config' })}>
                            <Icon name="settings" />
                            <Text>Settings</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'test'}
                            onPress={() => this.setState({ view: 'test' })}>
                            <Icon name="bug" />
                            <Text>Test</Text>
                        </Button>
                    </FooterTab>
                </Footer>

            </Container>



        );
    }
}

export default class tuibedsnfcroot extends Component {
    render() {
        return (
            <Root>
                <TuiBedsNfc />
            </Root>
        );
    }
}
AppRegistry.registerComponent('tuibedsnfchackathon', () => tuibedsnfcroot);
