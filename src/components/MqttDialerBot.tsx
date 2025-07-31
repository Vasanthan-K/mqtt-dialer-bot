import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Phone, Wifi, WifiOff, Settings, Activity } from 'lucide-react';
import * as mqtt from 'mqtt';

interface MqttMessage {
  topic: string;
  message: string;
  timestamp: Date;
  phoneNumber?: string;
}

interface MqttConfig {
  broker: string;
  port: number;
  topic: string;
  username?: string;
  password?: string;
}

export default function MqttDialerBot() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [config, setConfig] = useState<MqttConfig>({
    broker: 'broker.hivemq.com',
    port: 8000,
    topic: 'dialer/phone',
    username: '',
    password: ''
  });
  const [showSettings, setShowSettings] = useState(true);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const { toast } = useToast();

  const extractPhoneNumber = (message: string): string | null => {
    // Extract phone numbers in various formats
    const phoneRegex = /(\+?[\d\s\-\(\)]{7,15})/g;
    const matches = message.match(phoneRegex);
    if (matches && matches.length > 0) {
      // Clean up the phone number
      return matches[0].replace(/[\s\-\(\)]/g, '');
    }
    return null;
  };

  const makePhoneCall = async (phoneNumber: string) => {
    try {
      // For web version, we'll show a toast. In actual mobile app, this would use Capacitor's Phone plugin
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('lovableproject.com')) {
        toast({
          title: "Phone Call Triggered",
          description: `Would call: ${phoneNumber}`,
          duration: 5000
        });
        console.log(`Would make call to: ${phoneNumber}`);
      } else {
        // In actual mobile environment, use Capacitor Phone plugin
        window.open(`tel:${phoneNumber}`, '_system');
      }
    } catch (error) {
      toast({
        title: "Call Failed", 
        description: `Could not initiate call to ${phoneNumber}`,
        variant: "destructive"
      });
    }
  };

  const connectToMqtt = () => {
    try {
      const protocol = config.port === 8884 ? 'wss' : 'ws';
      const url = `${protocol}://${config.broker}:${config.port}/mqtt`;
      
      const options: mqtt.IClientOptions = {
        keepalive: 60,
        clientId: `mqtt_dialer_${Math.random().toString(16).slice(3)}`,
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
      };

      if (config.username) {
        options.username = config.username;
        options.password = config.password;
      }

      const client = mqtt.connect(url, options);
      clientRef.current = client;

      client.on('connect', () => {
        setIsConnected(true);
        setShowSettings(false);
        client.subscribe(config.topic, (err) => {
          if (err) {
            toast({
              title: "Subscription Failed",
              description: `Could not subscribe to topic: ${config.topic}`,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Connected & Subscribed",
              description: `Listening to ${config.topic}`,
            });
          }
        });
      });

      client.on('message', (topic, message) => {
        const messageStr = message.toString();
        const phoneNumber = extractPhoneNumber(messageStr);
        
        const mqttMessage: MqttMessage = {
          topic,
          message: messageStr,
          timestamp: new Date(),
          phoneNumber: phoneNumber || undefined
        };

        setMessages(prev => [mqttMessage, ...prev.slice(0, 49)]); // Keep last 50 messages

        if (phoneNumber) {
          toast({
            title: "Phone Number Detected",
            description: `Calling ${phoneNumber}...`,
          });
          makePhoneCall(phoneNumber);
        }
      });

      client.on('error', (err) => {
        toast({
          title: "Connection Error",
          description: err.message,
          variant: "destructive"
        });
      });

      client.on('close', () => {
        setIsConnected(false);
      });

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to MQTT broker",
        variant: "destructive"
      });
    }
  };

  const disconnect = () => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "MQTT connection closed",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl">
              <Phone className="h-8 w-8 text-primary" />
              MQTT Dialer Bot
            </CardTitle>
            <div className="flex items-center justify-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-accent" />
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">Disconnected</Badge>
                </>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Settings Panel */}
        {(showSettings || !isConnected) && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                MQTT Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="broker">Broker Host</Label>
                  <Input
                    id="broker"
                    value={config.broker}
                    onChange={(e) => setConfig(prev => ({ ...prev, broker: e.target.value }))}
                    placeholder="broker.hivemq.com"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 8000 }))}
                    placeholder="8000"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={config.topic}
                    onChange={(e) => setConfig(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="dialer/phone"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username (optional)</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="username"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="password"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {!isConnected ? (
                  <Button onClick={connectToMqtt} className="flex-1">
                    <Wifi className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                ) : (
                  <Button onClick={disconnect} variant="destructive" className="flex-1">
                    <WifiOff className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-4"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Panel */}
        {isConnected && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Incoming Messages
                <Badge variant="outline">{messages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for messages on topic: <code className="bg-muted px-2 py-1 rounded">{config.topic}</code></p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.map((msg, index) => (
                    <div key={index} className="border border-border rounded-lg p-3 bg-card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {msg.topic}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{msg.message}</p>
                      {msg.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-accent" />
                          <Badge className="bg-accent text-accent-foreground">
                            Called: {msg.phoneNumber}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}