import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Armchair,
  Calendar,
  CreditCard,
  Clock,
  ArrowRight,
  TrendingUp,
  Bell,
  BookOpen,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Good{' '}
          {new Date().getHours() < 12
            ? 'morning'
            : new Date().getHours() < 17
            ? 'afternoon'
            : 'evening'}
          , {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Ready to study? Here's your library overview.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/book">
          <Card className="group cursor-pointer border-primary/20 hover:border-primary/50 transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Armchair className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Book a Seat</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/bookings">
          <Card className="group cursor-pointer hover:border-blue-500/30 transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">My Bookings</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/fees">
          <Card className="group cursor-pointer hover:border-emerald-500/30 transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <CreditCard className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-sm font-medium">Pay Fees</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/notifications">
          <Card className="group cursor-pointer hover:border-amber-500/30 transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Notices</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Membership status */}
      {user?.membership ? (
        <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Membership
                  </span>
                </div>
                <p className="text-lg font-semibold">{user.membership.planName} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(user.membership.monthlyFeePaise)}/month
                </p>
              </div>
              <Badge variant="success">{user.membership.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5 text-center">
            <p className="text-muted-foreground mb-3">
              No active membership. Contact the library to get started.
            </p>
            <Button variant="outline" size="sm">
              Learn More
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Booking
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-muted-foreground">No booking today</p>
            <Link
              to="/book"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              Book now <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fee Status
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-muted-foreground">No dues</p>
            <Link
              to="/fees"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              View history <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Announcements
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-muted-foreground">No new notices</p>
            <Link
              to="/notifications"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Available seats CTA */}
      <Card className="overflow-hidden">
        <div className="relative p-6 md:p-8 bg-gradient-to-r from-primary to-blue-600 text-white">
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Find Your Perfect Study Spot
            </h2>
            <p className="text-blue-100 mb-4 max-w-md">
              Browse our interactive seat map, choose your shift, and reserve your desk in seconds.
            </p>
            <Link to="/book">
              <Button size="lg" className="bg-white text-primary hover:bg-blue-50 shadow-lg">
                <Armchair className="h-5 w-5 mr-2" />
                Explore Seats
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 right-16 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
        </div>
      </Card>
    </div>
  );
}
