<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderProfile extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'provider_profiles';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'business_name',
        'description',
        'experience_years',
        'location',
        'availability_status',
        'verification_status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'experience_years' => 'integer',
        ];
    }

    /**
     * Get the user that owns the provider profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The services that the provider offers (Many-to-Many).
     */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'provider_services', 'provider_id', 'service_id')
            ->withTimestamps();
    }

    /**
     * Get the service requests assigned to this provider.
     */
    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'provider_id');
    }

    /**
     * Get the reviews received by this provider.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'provider_id');
    }
}
