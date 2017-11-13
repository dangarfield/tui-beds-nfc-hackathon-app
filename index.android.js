import React, { Component } from 'react';
import { AppRegistry, Alert, AsyncStorage, View, BackAndroid, ToastAndroid, Image, DeviceEventEmitter, Linking } from 'react-native';
import { Container, Header, Title, Content, Footer, FooterTab, Button, Left, Right, Body, Icon, Text, Toast, Item, Label, Form, Input, Root, List, ListItem, Thumbnail, Grid, Col, Card, CardItem } from 'native-base';

import PubNub from 'pubnub';
import moment from 'moment-timezone';
import DeviceInfo from 'react-native-device-info';
import { readTag, writeTag, isNfcAvailable } from 'nfc-ndef-react-native';
// import codePush from "react-native-code-push";

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
            view: 'scanner',
            version: DeviceInfo.getVersion()
        };

        AsyncStorage.getItem('state').then((myState) => {
            if (myState !== null) {
                this.setState(JSON.parse(myState));
                this.setState({ 'status': "Config loaded" });
            } else {
                this.setState({ 'status': "Base config loaded" });
            }
        });

        this.writeTagData = this.writeTagData.bind(this);
        this.initialiseNfcListener = this.initialiseNfcListener.bind(this);
        this.removeReadTagData = this.removeReadTagData.bind(this);
    }
    componentDidMount() {
        this.initialisePubNub();
        this.initialiseNfcListener();
    };

    saveConfigAndReinitialise() {
        this.setState({ 'status': "saved" });
        var persistedState = {
            subscribeKey: this.state.subscribeKey,
            publishKey: this.state.publishKey,
            channelId: this.state.channelId,
            sensorId: this.state.sensorId
        };
        AsyncStorage.setItem('state', JSON.stringify(persistedState));
        this.initialisePubNub();
    }
    resetConfig() {
        AsyncStorage.removeItem('state');
        Alert.alert("Config Reset", "Please restart application");
        this.setState({ 'status': "Config Reset - Please restart application" });
    }



    initialisePubNub() {
        console.log("Initialising PubNub");
        this.setState({ 'status': "Config loaded" });

        if (pubnub != undefined) {
            pubnub.unsubscribeAll();
            pubnub.stop();
        }
        let uid = DeviceInfo.getUniqueID();
        let dname = DeviceInfo.getDeviceName();
        let uuid = dname + '_' + uid; //eg, Dan's Phone_9e4dfd21f2eb81d1

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
                let text = message.message;
                console.log('Message received', message);
                text.time = moment(new Date(message.timetoken / 1e4)).tz("Europe/London").format('h:mm a');
                console.log("Message parse", text);
                ToastAndroid.show(text.tag + ' -> ' + text.sensor, ToastAndroid.SHORT);

                var newHistory = [text, ...classThis.state.history];
                classThis.setState({ history: newHistory, pubnubStatus: "connected" });
            },
            status: function (s) {
                console.log("PubNub Status Event Listener", s);
                if (s.error === true) {
                    classThis.setState({ 'pubnubStatus': "error" });
                } else {
                    classThis.setState({ 'pubnubStatus': "connected" });
                }
            }
        });
        pubnub.subscribe({
            channels: [this.state.channelId]
        });
        this.setState({ 'status': "PubNub: Connected" });

    }

    initialiseNfcListener() {
        console.log('Initialise Nfc Listener');

        var classThis = this;

        // Commenting out as it the callback isn't working as expected and can't test locally - Quickfix
        // isNfcAvailable((available, msg) => {
        //     if (!available) {
        //         Alert.alert('NFC Unavailable', msg);
        //     }
        // });

        DeviceEventEmitter.addListener('onTagError', function (e) {
            console.log('NFC onTagError', e);
            // Don't need to visually warn about an error
            // Alert.alert('onTagError', JSON.stringify(e));
            // ToastAndroid.show('onTagError -> ' + JSON.stringify(e), ToastAndroid.SHORT);
        });


        DeviceEventEmitter.addListener('onTagDetected', function (e) {
            console.log('NFC onTagDetected', e);
            // Don't need to handle onTagDetected - read and write works fine
            // Alert.alert('onTagDetected', JSON.stringify(e));
        });

        DeviceEventEmitter.addListener('onTagRead', (e) => {
            console.log('NFC onTagRead', e);
            // Alert.alert('onTagRead', JSON.stringify(e));

            console.log('NFC onTagRead id compare: ' + classThis.state.nfcId + " - " + e.id);
            if (classThis.state.nfcId != e.id && e.value !== '') {
                ToastAndroid.show('Tag Read -> ' + e.value, ToastAndroid.SHORT);

                let id = e.id;
                let data = e.value;
                console.log('id', id);
                console.log('data', data);
                classThis.setState({ nfcId: e.id, nfcValue: e.value, tagValue: e.value });

                // broadcast message if NOT in edit mode
                if (this.state.view != 'edit' && this.state.view != 'write') {
                    this.publish();
                }
            }

            // this.readTagData();
        });

        DeviceEventEmitter.addListener('onTagWrite', (e) => {
            console.log('NFC onTagWrite', e);
            // Alert.alert('onTagWrite', JSON.stringify(e));

            // ToastAndroid.show('onTagWrite -> ' + JSON.stringify(e), ToastAndroid.SHORT);
            let id = e.id;
            let data = e.value;
            console.log('id', id);
            console.log('data', data);
            classThis.setState({ nfcId: e.id, nfcValue: e.value, tagValue: e.value, view: 'edit' });

            ToastAndroid.show('Tag written successfully', ToastAndroid.SHORT);

            this.readTagData();
        });

        this.readTagData();
    }

    readTagData() {
        readTag();
    }
    writeTagData() {
        console.log("state", this.state);
        let nfcValue = this.state.nfcValue !== undefined ? this.state.nfcValue : "";
        console.log("Writing NFC Value", nfcValue);
        this.setState({ view: 'write' });
        writeTag([nfcValue]);
    }
    removeReadTagData() {
        this.setState({ nfcId: '', nfcValue: '', tagValue: '' });
    }

    _handleSubscribeKeyChange = (key) => {
        this.setState({ subscribeKey: key, status: "Updating subscribeKey" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handlePublishKeyChange = (key) => {
        this.setState({ publishKey: key, status: "Updating publishKey" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handleChannelIdChange = (id) => {
        this.setState({ channelId: id, status: "Updating channelId" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handleSensorIdChange = (id) => {
        this.setState({ sensorId: id, status: "Updating sensorId" });
        setTimeout(() => this.saveConfigAndReinitialise(), 0);
    };
    _handleTagValueChange = (text) => {
        this.setState({ tagValue: text, status: "Updated tag value" });
    };
    _handleNfcValueChange = (text) => {
        this.setState({ nfcValue: text, status: "Updated nfc value" });
    }
    _handleViewChange = (view) => {
        this.setState({ view: view, nfcId: '', nfcValue: '', tagValue: '' });
    }

    sendTestTag = () => {
        let names = ["Daenerys Targaryen", "Khal Drogo", "Grey Worm", "Jon Snow", "Sansa Stark", "Arya Stark", "Bran Stark", "Brienne of Tarth", "Podrick Payne", "Tyrion Lannister", "Bronn", "Cersei Lannister", "Gregor Clegane", "Jaime Lannister", "Jorah Mormont", "Davos Seaworth", "Samwell Tarly", "Hodor", "Tormund Giantsbane", "Theon Greyjoy"];
        let newTag = names[Math.floor(Math.random() * names.length)];
        //let newTag = "" + Math.floor(100000000 + Math.random() * 900000000) // Or random number
        this.setState({ tagValue: newTag });
        setTimeout(() => this.publish(), 0);

    }
    publish = () => {
        console.log('Publishing tag');
        let classThis = this;

        if (this.state.tagValue.length === 0) {
            console.log('Tag Value empty, not publishing');
        } else {
            pubnub.publish({
                channel: this.state.channelId,
                message: { "sensor": this.state.sensorId, "tag": this.state.tagValue }
            }, function (status, response) {
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

    }


    renderView() {
        switch (this.state.view) {
            case 'scanner':
                console.log('View: scanner');
                return (
                    <Content padder>

                        <Card>
                            <CardItem>
                                <Left>
                                    <Icon name='alert' />
                                    <Body>
                                        <Text>Scan your tags -&nbsp;
                                            <Text style={{ color: 'blue', textDecorationLine: 'underline' }}
                                                onPress={() => Linking.openURL('https://github.com/dangarfield/tui-beds-nfc-hackathon-app/blob/master/README.md')}>
                                                Instructions
                                            </Text>
                                        </Text>
                                    </Body>
                                </Left>
                            </CardItem>
                        </Card>

                        <Image source={require('./img/nfc-icon.png')}
                            style={{ height: 350, width: null, flex: 1 }} />

                        {this.state.history.length > 0 &&
                            <ListItem avatar>
                                <Left>
                                    {/*<Thumbnail source={{ uri: 'https://robohash.org/' + item.tag }} />*/}
                                    <Thumbnail source={{ uri: 'https://first-image-service-npttfcvrns.now.sh/' + this.state.history[0].tag }} />
                                </Left>
                                <Body>
                                    <Text>{this.state.history[0].tag}</Text>
                                    <Text note>Checked in at: {this.state.history[0].sensor}</Text>
                                </Body>
                                <Right>
                                    <Text note>{this.state.history[0].time}</Text>
                                </Right>
                            </ListItem>
                        }
                    </Content >);
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
                        <Label style={{ textAlign: 'right' }}>Version: {this.state.version}</Label>
                    </Content >);
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

            case 'edit':
                console.log('View: edit');
                return (
                    <Content>
                        <Content padder>


                            <Card>
                                <CardItem>
                                    <Left>
                                        <Icon name='alert' />
                                        <Body>
                                            <Text>Read and write to NFC tags</Text>
                                        </Body>
                                    </Left>
                                </CardItem>
                            </Card>

                            <Item stackedLabel>
                                <Label>NFC ID - {this.state.nfcId}</Label>
                                <Label>NFC Value</Label>
                                <Input
                                    placeholder='The NFC body content'
                                    value={this.state.nfcValue}
                                    onChangeText={this._handleNfcValueChange}
                                    />
                            </Item>
                        </Content>
                        <Grid>
                            <Col>
                                <Content padder>
                                    <Button block
                                        onPress={this.removeReadTagData}>
                                        <Text>
                                            Re-read tag
                                        </Text>
                                    </Button>
                                </Content>
                            </Col>

                            <Col>
                                <Content padder>
                                    <Button block
                                        onPress={this.writeTagData}>
                                        <Text>
                                            Write to tag
                                        </Text>
                                    </Button>
                                </Content>
                            </Col>
                        </Grid>


                    </Content>);
                break;
            case 'write':
                console.log('View: write');
                return (
                    <Content padder>
                        <Card>
                            <CardItem>
                                <Left>
                                    <Icon name='alert' />
                                    <Body>
                                        <Text>Place nfc tag on phone to write - {this.state.nfcValue}</Text>
                                    </Body>
                                </Left>
                            </CardItem>
                        </Card>
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
                            onPress={() => this._handleViewChange('scanner')}>
                            <Icon name="wifi" />
                            <Text>Scan</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'history'}
                            onPress={() => this._handleViewChange('history')}>
                            <Icon name="chatboxes" />
                            <Text>Logs</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'config'}
                            onPress={() => this._handleViewChange('config')}>
                            <Icon name="settings" />
                            <Text>Config</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'test'}
                            onPress={() => this._handleViewChange('test')}>
                            <Icon name="bug" />
                            <Text>Test</Text>
                        </Button>
                        <Button vertical
                            active={this.state.view === 'edit'}
                            onPress={() => this._handleViewChange('edit')}>
                            <Icon name="create" />
                            <Text>Edit</Text>
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
// let codePushOptions = { checkFrequency: codePush.CheckFrequency.ON_APP_RESUME };
// AppRegistry.registerComponent('tuibedsnfchackathon', () => codePush(codePushOptions)(tuibedsnfcroot));
AppRegistry.registerComponent('tuibedsnfchackathon', () => tuibedsnfcroot);
