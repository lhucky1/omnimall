
"use client";

import { useState, useEffect } from "react";
import { getTeamMembers } from "@/app/actions/team";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Phone, User, Users, School } from "lucide-react";
import type { TeamMember } from "@/types";

function TeamMemberCard({ member }: { member: TeamMember }) {
  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, ''); // Remove non-digit characters
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    return cleaned;
  }

  const contactLink = member.phone 
    ? `https://wa.me/${formatWhatsAppNumber(member.phone)}`
    : `mailto:${member.email}`;

  return (
    <Card className="text-center overflow-hidden flex flex-col">
      <CardContent className="pt-6 flex flex-col items-center flex-grow">
        <Avatar className="h-24 w-24 mx-auto mb-4 border-2 border-primary">
          <AvatarImage src={member.image_url || ''} alt={member.name} />
          <AvatarFallback className="text-3xl bg-secondary">
              {member.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-bold">{member.name}</h3>
        <p className="text-primary font-medium">{member.role}</p>
        {member.school && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <School className="h-4 w-4" />
                <span>{member.school}</span>
            </div>
        )}
        <div className="flex-grow" />
         <Button asChild className="mt-4">
          <a href={contactLink} target="_blank" rel="noopener noreferrer">
            Reach Out
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}


export default function TeamPage() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            const { data } = await getTeamMembers();
            setTeam(data || []);
            setLoading(false);
        };
        fetchTeam();
    }, []);

    return (
        <div className="container mx-auto px-4 py-12">
            <section className="text-center mb-12">
                <div className="inline-block bg-primary/10 text-primary p-4 rounded-full mb-4">
                    <Users className="w-10 h-10" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">
                    Meet the Team
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-foreground/80">
                    The passionate individuals behind OMNIMALL, dedicated to serving the university community.
                </p>
            </section>

            {loading ? (
                <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : team.length === 0 ? (
                <p className="text-center text-muted-foreground">No team members to display yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    {team.map(member => (
                        <TeamMemberCard key={member.id} member={member} />
                    ))}
                </div>
            )}
        </div>
    );
}
