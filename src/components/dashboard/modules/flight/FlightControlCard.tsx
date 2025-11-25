import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plane, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function FlightControlCard() {
  const [tailNumber, setTailNumber] = useState('');
  const [isFlying, setIsFlying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadCurrentFlight();
  }, []);

  const loadCurrentFlight = async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('current_flight')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setTailNumber(data.tail_number || '');
        setIsFlying(data.flight_status === 'in_flight');
        setLastSaved(data.updated_at ? new Date(data.updated_at) : null);
      }
    } catch (error) {
      console.error('Error loading flight info:', error);
    }
  };

  const handleSave = async () => {
    if (!supabase) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const flightData = {
        user_id: user.id,
        tail_number: tailNumber.toUpperCase(),
        flight_status: isFlying ? 'in_flight' : 'on_ground',
        destination: null,
        departure_time: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('current_flight')
        .upsert(flightData, { onConflict: 'user_id' });

      if (error) throw error;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving flight info:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-secondary" />
            <CardTitle>Flight Status</CardTitle>
          </div>
          <Badge
            variant={isFlying ? 'default' : 'secondary'}
            className={isFlying ? 'bg-green-500/20 text-green-400 border-green-500/40' : ''}
          >
            {isFlying ? 'Flying' : 'On Ground'}
          </Badge>
        </div>
        <CardDescription>
          Live FlightAware tracking displays on your homepage when flying
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tail">Tail Number</Label>
          <Input
            id="tail"
            placeholder="N12345"
            value={tailNumber}
            onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
            className="font-mono"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="flying-status">Currently Flying</Label>
            <p className="text-xs text-muted-foreground">Toggle on when airborne</p>
          </div>
          <Switch
            id="flying-status"
            checked={isFlying}
            onCheckedChange={setIsFlying}
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {lastSaved && <>Updated: {lastSaved.toLocaleTimeString()}</>}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !tailNumber}
            size="sm"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

