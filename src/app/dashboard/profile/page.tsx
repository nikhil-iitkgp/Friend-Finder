"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, MapPin, Briefcase, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useUser, useUserActions } from '@/store/userStore';
import { ProfileUpdateSchema, type ProfileUpdateInput } from '@/lib/validations';

interface InterestInputProps {
  interests: string[];
  onChange: (interests: string[]) => void;
}

function InterestInput({ interests, onChange }: InterestInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addInterest = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 20) {
      onChange([...interests, trimmed]);
      setInputValue('');
    }
  };

  const removeInterest = (interest: string) => {
    onChange(interests.filter(i => i !== interest));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add an interest..."
          maxLength={50}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addInterest}
          disabled={!inputValue.trim() || interests.length >= 20}
        >
          Add
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {interests.map((interest, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => removeInterest(interest)}
          >
            {interest} ×
          </Badge>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {interests.length}/20 interests. Click on an interest to remove it.
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const user = useUser();
  const { updateProfile } = useUserActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      bio: '',
      occupation: '',
      interests: [],
      birthday: '',
      profilePicture: '',
      isDiscoverable: true,
      discoveryRange: 5000,
      privacySettings: {
        showAge: true,
        showLocation: true,
        showLastSeen: true,
        allowMessages: true,
        allowCalls: true,
      },
    },
  });

  // Load user data into form when available
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        occupation: user.occupation || '',
        interests: user.interests || [],
        birthday: user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '',
        profilePicture: user.profilePicture || '',
        isDiscoverable: user.isDiscoverable ?? true,
        discoveryRange: user.discoveryRange || 5000,
        privacySettings: {
          showAge: user.privacySettings?.showAge ?? true,
          showLocation: user.privacySettings?.showLocation ?? true,
          showLastSeen: user.privacySettings?.showLastSeen ?? true,
          allowMessages: user.privacySettings?.allowMessages ?? true,
          allowCalls: user.privacySettings?.allowCalls ?? true,
        },
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileUpdateInput) => {
    setIsSubmitting(true);
    
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(`Failed to update profile: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (url: string) => {
    form.setValue('profilePicture', url);
    setUploadError(null);
  };

  const handleImageError = (error: string) => {
    setUploadError(error);
    toast.error(`Upload failed: ${error}`);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">
          Manage your profile information and privacy settings
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Picture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Profile Picture
            </CardTitle>
            <CardDescription>
              Upload a profile picture to help others recognize you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ImageUpload
                value={form.watch('profilePicture')}
                onChange={handleImageUpload}
                onError={handleImageError}
                className="mx-auto"
              />
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your basic profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...form.register('username')}
                  placeholder="Enter your username"
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="Enter your first name"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  placeholder="Enter your last name"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.watch('bio')?.length || 0}/500 characters
              </p>
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  {...form.register('occupation')}
                  placeholder="What do you do?"
                />
                {form.formState.errors.occupation && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.occupation.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  {...form.register('birthday')}
                />
                {form.formState.errors.birthday && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.birthday.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Interests</Label>
              <InterestInput
                interests={form.watch('interests') || []}
                onChange={(interests) => form.setValue('interests', interests)}
              />
              {form.formState.errors.interests && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.interests.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discovery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Discovery Settings
            </CardTitle>
            <CardDescription>
              Control how others can discover and connect with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isDiscoverable">Make me discoverable</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to find you through discovery methods
                </p>
              </div>
              <Switch
                id="isDiscoverable"
                checked={form.watch('isDiscoverable')}
                onCheckedChange={(checked) => form.setValue('isDiscoverable', checked)}
              />
            </div>

            <div>
              <Label htmlFor="discoveryRange">Discovery Range (meters)</Label>
              <Input
                id="discoveryRange"
                type="number"
                min={100}
                max={50000}
                step={100}
                {...form.register('discoveryRange', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How far others can be to discover you (100m - 50km)
              </p>
              {form.formState.errors.discoveryRange && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.discoveryRange.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control what information others can see about you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show my age</Label>
                <p className="text-sm text-muted-foreground">
                  Display your age on your profile
                </p>
              </div>
              <Switch
                checked={form.watch('privacySettings.showAge')}
                onCheckedChange={(checked) => 
                  form.setValue('privacySettings.showAge', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show my location</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to see your general location
                </p>
              </div>
              <Switch
                checked={form.watch('privacySettings.showLocation')}
                onCheckedChange={(checked) => 
                  form.setValue('privacySettings.showLocation', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show when I was last seen</Label>
                <p className="text-sm text-muted-foreground">
                  Display your last activity time
                </p>
              </div>
              <Switch
                checked={form.watch('privacySettings.showLastSeen')}
                onCheckedChange={(checked) => 
                  form.setValue('privacySettings.showLastSeen', checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow messages</Label>
                <p className="text-sm text-muted-foreground">
                  Let others send you messages
                </p>
              </div>
              <Switch
                checked={form.watch('privacySettings.allowMessages')}
                onCheckedChange={(checked) => 
                  form.setValue('privacySettings.allowMessages', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow voice/video calls</Label>
                <p className="text-sm text-muted-foreground">
                  Enable others to call you
                </p>
              </div>
              <Switch
                checked={form.watch('privacySettings.allowCalls')}
                onCheckedChange={(checked) => 
                  form.setValue('privacySettings.allowCalls', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}